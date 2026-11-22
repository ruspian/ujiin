import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

/**
 * Konversi soal dari file Word (.docx) ke baris siap-impor (format sama dengan
 * Template_Soal.xlsx / importQuestions).
 *
 * Mengenali pola yang lazim dipakai guru:
 *  - bagian per jenis soal ("A. PILIHAN GANDA BIASA", "MENJODOHKAN", "BENAR ATAU SALAH",
 *    "ISIAN SINGKAT"/"URAIAN", dst.)
 *  - stimulus ("Stimulus 1 – Judul" lalu teks/tabel bacaan), ditempel ke tiap soalnya
 *  - soal bernomor "1. ..." dengan pilihan "A. ... E."
 *  - benar/salah dalam tabel atau satu baris ("... Jawaban: ( )")
 *  - menjodohkan: daftar pilihan bersama, atau tabel "KOLOM A | KOLOM B" per soal
 *  - tabel "KUNCI JAWABAN" di akhir dokumen (dan kunci esai berupa "29. teks")
 *
 * Hasilnya hanya DRAFT: yang tidak terbaca diberi peringatan, dan guru memeriksanya
 * di pratinjau sebelum mengimpor.
 */

export type SoalRow = {
  Tipe_Soal: "MULTIPLE_CHOICE" | "MULTIPLE_CHOICE_COMPLEX" | "MATCHING" | "ESSAY" | "TRUE_FALSE";
  Teks_Soal: string;
  Opsi_A?: string;
  Opsi_B?: string;
  Opsi_C?: string;
  Opsi_D?: string;
  Opsi_E?: string;
  Kunci_Jawaban?: string;
  Skor?: number;
};

export type WordSoalResult = {
  rows: SoalRow[];
  warnings: string[];
  counts: Record<SoalRow["Tipe_Soal"], number>;
};

type Block =
  | { t: "p"; text: string; heading: boolean; marked?: boolean }
  | { t: "tbl"; rows: string[][] };

type Sec = "PG" | "PGK" | "MATCH" | "TF" | "ESSAY";

const MAX_OPT = 5;
const LETTERS = ["A", "B", "C", "D", "E"] as const;

// ─────────────────────────── membaca .docx ───────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type XNode = any; // node @xmldom/xmldom (bukan DOM browser)

function textOf(node: XNode): string {
  let out = "";
  const walk = (n: XNode) => {
    const name = n.nodeName;
    if (name === "w:t") out += n.textContent ?? "";
    else if (name === "w:tab") out += " ";
    else if (name === "w:br" || name === "w:cr") out += "\n";
    for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
  };
  walk(node);
  return out;
}

function clean(s: string): string {
  return s
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function childrenNamed(node: XNode, name: string): XNode[] {
  const res: XNode[] = [];
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (c.nodeName === name) res.push(c);
  }
  return res;
}

// Apakah bagian akhir paragraf ditebalkan / digarisbawahi / di-highlight (penanda kunci di sebagian dokumen)?
function isMarked(p: XNode): boolean {
  const runs: XNode[] = Array.from(p.getElementsByTagName("w:r"));
  for (let i = runs.length - 1; i >= 0; i--) {
    const r = runs[i];
    const t = textOf(r).trim();
    if (!t) continue;
    const rpr: XNode = childrenNamed(r, "w:rPr")[0];
    if (!rpr) return false;
    const on = (tag: string) => {
      const el: XNode = childrenNamed(rpr, tag)[0];
      if (!el) return false;
      const v = el.getAttribute("w:val");
      return v !== "0" && v !== "false" && v !== "none";
    };
    return on("w:b") || on("w:u") || on("w:highlight");
  }
  return false;
}

export async function readDocxBlocks(buffer: Buffer | Uint8Array): Promise<Block[]> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("Bukan file Word (.docx) yang valid.");
  const xml = await file.async("string");
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const body: XNode = doc.getElementsByTagName("w:body")[0];
  if (!body) throw new Error("Isi dokumen Word tidak terbaca.");

  const blocks: Block[] = [];
  for (let n = body.firstChild; n; n = n.nextSibling) {
    if (n.nodeName === "w:p") {
      const text = clean(textOf(n));
      const style: XNode = n.getElementsByTagName("w:pStyle")[0];
      const sv = style?.getAttribute("w:val") ?? "";
      const heading = /^Heading|^Judul/i.test(sv);
      // Enter lunak (Shift+Enter) di Word = baris baru dalam satu paragraf; anggap baris terpisah.
      const marked = isMarked(n);
      for (const line of text.split("\n")) blocks.push({ t: "p", text: line.trim(), heading, marked });
    } else if (n.nodeName === "w:tbl") {
      const rows: string[][] = [];
      for (const tr of childrenNamed(n, "w:tr")) {
        const cells = childrenNamed(tr, "w:tc").map((tc: XNode) =>
          clean(childrenNamed(tc, "w:p").map((p: XNode) => textOf(p)).join("\n")),
        );
        rows.push(cells);
      }
      blocks.push({ t: "tbl", rows });
    }
  }
  return blocks;
}

// ─────────────────────────── pola teks ───────────────────────────

function secOf(text: string): Sec | null {
  const t = text.trim();
  if (!t || t.length > 70 || /^\d+\s*[.)]/.test(t)) return null;
  const s = t.toLowerCase().replace(/^[a-z]\s*[.)]\s*/, "");
  if (/pilihan ganda\s*kompleks|pg\s*kompleks|pilihan ganda majemuk/.test(s)) return "PGK";
  if (/pilihan ganda/.test(s)) return "PG";
  if (/menjodohkan/.test(s)) return "MATCH";
  if (/benar\s*(atau|dan|\/|-)?\s*salah/.test(s)) return "TF";
  if (/isian|uraian|esai|essay/.test(s)) return "ESSAY";
  return null;
}

const RE_Q = /^(\d{1,3})\s*[.)]\s*([\s\S]+)$/;
const RE_OPT = /^\(?([A-Ha-h])\s*[.)]\s*([\s\S]+)$/;
const RE_INLINE_KEY = /^(?:kunci(?:\s*jawaban)?|kj|jawaban(?:\s*benar)?)\s*[:=]\s*(\S[\s\S]*)$/i;
const RE_KEYLINE = /(\d{1,3})\s*[.):=-]\s*([A-Ha-h](?:\s*[,;&]\s*[A-Ha-h])*|benar|salah)(?=\s|$|[,;])/gi;
const RE_STIM = /^stimulus\b/i;
const RE_DOTS = /^[.…_\-\s]+$/;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = (s: string) => esc(s).replace(/\n/g, "<br>");
const noPipe = (s: string) => s.replace(/\|/g, "/").trim();

function normTF(v: string): "BENAR" | "SALAH" | "" {
  const s = v.trim().toLowerCase().replace(/[().]/g, "");
  if (s === "benar" || s === "b") return "BENAR";
  if (s === "salah" || s === "s") return "SALAH";
  return "";
}

function normLetters(v: string): string {
  const ls = v.toUpperCase().match(/[A-H]/g) ?? [];
  return Array.from(new Set(ls)).sort().join(",");
}

// ─────────────────────────── model sementara ───────────────────────────

type Stim = { title: string; parts: string[] };
type Q = {
  num: number;
  sec: Sec;
  text: string;
  opts: { id: string; text: string; marked?: boolean }[];
  stim: Stim | null;
  implicit?: boolean;
  key?: string; // kunci tertulis tepat di bawah soal
  left?: string[]; // MATCH: kolom A
  right?: { id: string; text: string }[]; // MATCH per-soal: kolom B
};
type MatchGroup = {
  stim: Stim | null;
  items: { num: number; left: string }[];
  choices: { id: string; text: string }[];
};

// Daftar pilihan kanan menjodohkan (dipakai bila kunci tidak dibaca, supaya guru bisa memasangkan sendiri)
function refList(choices: { id: string; text: string }[]): string {
  if (!choices.length) return "";
  return "<br><br><b>Pilihan jawaban:</b><br>" + choices.map((c) => `${c.id}. ${esc(c.text)}`).join("<br>");
}

function stimHtml(stim: Stim | null): string {
  if (!stim) return "";
  const title = stim.title ? `<b>${esc(stim.title)}</b>` : "";
  const body = stim.parts.map(html).join("<br>");
  return [title, body].filter(Boolean).join("<br>") + "<br><br>";
}

// ─────────────────────────── parser utama ───────────────────────────

/**
 * @param withKeys false (default): hanya soal + pilihan; kunci jawaban & skor dikosongkan
 *   (guru mengisinya sendiri di Excel). true: baca juga kunci dan bagi bobot ke totalBobot.
 */
export function parseWordBlocks(
  blocks: Block[],
  totalBobot: number | null = 100,
  withKeys = false,
): WordSoalResult {
  const warnings: string[] = [];
  const questions: Q[] = [];
  const groups: MatchGroup[] = [];
  const keys: Record<Sec, Map<number, string>> = {
    PG: new Map(), PGK: new Map(), MATCH: new Map(), TF: new Map(), ESSAY: new Map(),
  };
  const anyKey = new Map<number, string>(); // cadangan bila bagian kunci tak terdeteksi

  let mode: "SOAL" | "KUNCI" = "SOAL";
  let sec: Sec | null = null;
  let keySec: Sec | null = null;
  let stim: Stim | null = null;
  let cur: Q | null = null;
  let group: MatchGroup | null = null;
  let implicitSec = false;
  let collecting = false; // sedang membaca "Pilihan jawaban:" bersama (menjodohkan)

  const flush = () => {
    cur = null;
  };

  for (const b of blocks) {
    if (mode === "KUNCI") {
      if (b.t === "p") {
        const s = secOf(b.text);
        if (s) { keySec = s; continue; }
        if (/^rekapitulasi/i.test(b.text)) break;
        const pairs = Array.from(b.text.matchAll(RE_KEYLINE));
        if (pairs.length > 1 || (pairs.length === 1 && pairs[0][0].length === b.text.trim().length)) {
          for (const pm of pairs) {
            const n = Number(pm[1]);
            keys[keySec ?? "PG"].set(n, pm[2]);
            anyKey.set(n, pm[2]);
          }
          continue;
        }
        const m = RE_Q.exec(b.text);
        if (m) {
          const n = Number(m[1]);
          const target = keySec ?? "ESSAY";
          keys[target].set(n, m[2].trim());
          anyKey.set(n, m[2].trim());
        }
      } else {
        for (const row of b.rows) {
          for (let i = 0; i + 1 < row.length; i += 2) {
            if (!/^\d{1,3}$/.test(row[i])) continue;
            const n = Number(row[i]);
            const target = keySec ?? "PG";
            keys[target].set(n, row[i + 1]);
            anyKey.set(n, row[i + 1]);
          }
        }
      }
      continue;
    }

    if (b.t === "p") {
      const text = b.text;
      if (!text) continue;

      const ik = RE_INLINE_KEY.exec(text);
      if (ik && cur && !RE_DOTS.test(ik[1])) {
        if (!withKeys) continue;
        const c = cur as Q;
        if (c.sec !== "ESSAY" || !c.key) c.key = ik[1].trim();
        continue;
      }

      if (/^kunci\s*jawaban/i.test(text)) {
        if (!withKeys) break; // bagian kunci di akhir dokumen diabaikan
        mode = "KUNCI"; keySec = null; flush(); continue;
      }

      const s = secOf(text);
      if (s) { sec = s; implicitSec = false; stim = null; flush(); group = null; collecting = false; continue; }

      if (RE_STIM.test(text)) {
        flush(); collecting = false;
        const short = text.replace(/\s+untuk soal.*$/i, "").trim();
        stim = { title: short, parts: [] };
        continue;
      }

      if (/^pilihan jawaban\s*:?$/i.test(text)) { collecting = true; continue; }

      if (RE_DOTS.test(text) || /^jawaban\s*:/i.test(text)) continue;

      const q = RE_Q.exec(text);
      if (q && !sec) {
        // dokumen tanpa judul bagian: anggap pilihan ganda (jadi esai bila tak punya pilihan)
        sec = "PG";
        implicitSec = true;
        warnings.push("Judul bagian (mis. “A. PILIHAN GANDA”) tidak ditemukan; soal tanpa pilihan dianggap esai, sisanya pilihan ganda.");
      }
      if (q && sec) {
        collecting = false;
        let body = q[2].trim();
        if (sec === "TF") body = body.replace(/\s*jawaban\s*:[\s\S]*$/i, "").trim();
        cur = { num: Number(q[1]), sec, text: body, opts: [], stim, implicit: implicitSec };
        questions.push(cur);
        continue;
      }

      const o = RE_OPT.exec(text);
      if (o) {
        let ot = o[2].trim();
        let mk = !!b.marked;
        if (/\s*(\*|✓|✔|√)\s*$/.test(ot)) { ot = ot.replace(/\s*(\*|✓|✔|√)\s*$/, "").trim(); mk = true; }
        const opt = { id: o[1].toUpperCase(), text: ot, marked: mk };
        if (collecting && group) group.choices.push(opt);
        else if (cur && !collecting) (cur as Q).opts.push(opt);
        continue;
      }

      // teks biasa
      const c = cur as Q | null;
      if (c && c.opts.length === 0 && !c.left) c.text += "\n" + text;
      else if (!c && stim) stim.parts.push(text);
      continue;
    }

    // ── tabel ──
    const rows = b.rows.filter((r) => r.some(Boolean));
    if (!rows.length || !sec) continue;
    const head = rows[0].join(" ").toLowerCase();

    if (sec === "MATCH" && /kolom/.test(head)) {
      if (/\bno\b|nomor/.test(head)) {
        // tabel "No | Kolom A | Jawaban" + pilihan bersama
        group = { stim, items: [], choices: [] };
        groups.push(group);
        for (const r of rows.slice(1)) {
          if (/^\d{1,3}$/.test(r[0]) && r[1]) group.items.push({ num: Number(r[0]), left: r[1] });
        }
        collecting = false;
      } else if (cur) {
        // tabel "KOLOM A | KOLOM B" milik soal sebelumnya
        const c = cur as Q;
        c.left = [];
        c.right = [];
        for (const r of rows.slice(1)) {
          const l = /^\d+\s*[.)]\s*([\s\S]+)$/.exec(r[0] ?? "");
          const rr = /^([A-H])\s*[.)]\s*([\s\S]+)$/.exec(r[1] ?? "");
          if (l) c.left.push(l[1].trim());
          if (rr) c.right.push({ id: rr[1].toUpperCase(), text: rr[2].trim() });
        }
      }
      continue;
    }

    if (sec === "TF" && rows.some((r) => RE_Q.test(r[0] ?? ""))) {
      for (const r of rows) {
        const m = RE_Q.exec(r[0] ?? "");
        if (!m) continue;
        const body = m[2].replace(/\s*jawaban\s*:[\s\S]*$/i, "").trim();
        questions.push({ num: Number(m[1]), sec: "TF", text: body, opts: [], stim });
      }
      continue;
    }

    // tabel bacaan / stimulus
    const passage = rows.map((r) => r.filter(Boolean).join(" ")).join("\n");
    if (passage) {
      if (!stim) stim = { title: "", parts: [] };
      if (!cur) stim.parts.push(passage);
    }
  }

  // ── susun baris ──
  const out: SoalRow[] = [];
  const keyOf = (s: Sec, n: number) => keys[s].get(n) ?? anyKey.get(n) ?? "";

  const ordered = [...questions].sort((a, b) => a.num - b.num);
  const matchDone = new Set<MatchGroup>();

  type Draft = { row: SoalRow; pairs?: number; num: number };

  const drafts: Draft[] = [];
  let curNum = 0;
  const pushRow = (row: SoalRow, pairs?: number) => drafts.push({ row, pairs, num: curNum });

  for (const q of ordered) {
    curNum = q.num;
    if (q.implicit && q.opts.length === 0) q.sec = "ESSAY";
    const base = stimHtml(q.stim) + html(q.text);
    if (q.sec === "PG" || q.sec === "PGK") {
      const row: SoalRow = {
        Tipe_Soal: q.sec === "PG" ? "MULTIPLE_CHOICE" : "MULTIPLE_CHOICE_COMPLEX",
        Teks_Soal: base,
      };
      if (q.opts.length < 2) warnings.push(`Soal ${q.num}: pilihan jawaban tidak terbaca.`);
      if (q.opts.length > MAX_OPT)
        warnings.push(`Soal ${q.num}: pilihan lebih dari ${MAX_OPT}, hanya A–E yang dipakai.`);
      q.opts.slice(0, MAX_OPT).forEach((o, i) => {
        (row as Record<string, unknown>)[`Opsi_${LETTERS[i]}`] = o.text;
      });
      let k = withKeys ? normLetters(q.key ?? "") || normLetters(keyOf(q.sec, q.num)) : "";
      if (withKeys && !k && q.opts.length > 1) {
        const mk = q.opts.filter((o) => o.marked);
        if (mk.length && mk.length < q.opts.length) k = mk.map((o) => o.id).sort().join(",");
      }
      if (!withKeys) k = "";
      else if (!k) warnings.push(`Soal ${q.num}: kunci jawaban tidak ditemukan.`);
      else if (q.sec === "PG" && k.includes(",")) {
        warnings.push(`Soal ${q.num}: kunci lebih dari satu untuk pilihan ganda biasa, diambil ${k[0]}.`);
        row.Kunci_Jawaban = k[0];
      } else if (k) row.Kunci_Jawaban = k;
      pushRow(row);
    } else if (q.sec === "TF") {
      const k = normTF(q.key ?? "") || normTF(keyOf("TF", q.num));
      if (!withKeys) pushRow({ Tipe_Soal: "TRUE_FALSE", Teks_Soal: base });
      else {
        if (!k) warnings.push(`Soal ${q.num}: kunci benar/salah tidak ditemukan (diisi BENAR, mohon cek).`);
        pushRow({ Tipe_Soal: "TRUE_FALSE", Teks_Soal: base, Kunci_Jawaban: k || "BENAR" });
      }
    } else if (q.sec === "ESSAY") {
      if (!withKeys) pushRow({ Tipe_Soal: "ESSAY", Teks_Soal: base });
      else {
        const k = (q.key && !/^[\s().…_-]*$/.test(q.key) ? q.key : "") || keyOf("ESSAY", q.num);
        if (!k) warnings.push(`Soal ${q.num}: kunci/pedoman jawaban esai tidak ditemukan.`);
        pushRow({ Tipe_Soal: "ESSAY", Teks_Soal: base, Kunci_Jawaban: k });
      }
    } else if (q.sec === "MATCH") {
      if (q.left && q.right && !withKeys) {
        // tanpa kunci: tulis sisi kiri saja, pilihan kanan dicantumkan di teks soal sebagai acuan
        const row: SoalRow = {
          Tipe_Soal: "MATCHING",
          Teks_Soal: base + refList(q.right),
        };
        q.left.slice(0, MAX_OPT).forEach((l, i) => {
          (row as Record<string, unknown>)[`Opsi_${LETTERS[i]}`] = `${noPipe(l)} | `;
        });
        if (q.left.length > MAX_OPT) warnings.push(`Soal ${q.num}: lebih dari ${MAX_OPT} pasangan, sisanya dilewati.`);
        pushRow(row, Math.min(q.left.length, MAX_OPT));
      } else if (q.left && q.right) {
        const map = new Map<number, string>();
        for (const part of keyOf("MATCH", q.num).split(/[,;]/)) {
          const m = /(\d+)\s*[-–:=]\s*([A-Ha-h])/.exec(part);
          if (m) map.set(Number(m[1]), m[2].toUpperCase());
        }
        const pairs: string[] = [];
        q.left.slice(0, MAX_OPT).forEach((l, i) => {
          const rid = map.get(i + 1);
          const r = q.right!.find((x) => x.id === rid);
          if (!r) warnings.push(`Soal ${q.num}: pasangan ${i + 1} tidak punya kunci.`);
          else pairs.push(`${noPipe(l)} | ${noPipe(r.text)}`);
        });
        if (q.left.length > MAX_OPT) warnings.push(`Soal ${q.num}: lebih dari ${MAX_OPT} pasangan, sisanya dilewati.`);
        const row: SoalRow = { Tipe_Soal: "MATCHING", Teks_Soal: base };
        pairs.forEach((p, i) => ((row as Record<string, unknown>)[`Opsi_${LETTERS[i]}`] = p));
        if (pairs.length) pushRow(row, pairs.length);
      } else {
        warnings.push(`Soal ${q.num}: tabel pasangan (Kolom A/B) tidak ditemukan.`);
      }
    }
  }

  // menjodohkan dengan pilihan bersama
  for (const g of groups) {
    if (matchDone.has(g)) continue;
    matchDone.add(g);
    const pairs: { n: number; text: string }[] = [];
    for (const it of g.items) {
      if (!withKeys) {
        pairs.push({ n: it.num, text: `${noPipe(it.left)} | ` });
        continue;
      }
      const rid = normLetters(keyOf("MATCH", it.num))[0];
      const r = g.choices.find((c) => c.id === rid);
      if (!r) warnings.push(`Menjodohkan nomor ${it.num}: kunci/pilihan tidak ditemukan.`);
      else pairs.push({ n: it.num, text: `${noPipe(it.left)} | ${noPipe(r.text)}` });
    }
    for (let i = 0; i < pairs.length; i += MAX_OPT) {
      const chunk = pairs.slice(i, i + MAX_OPT);
      const row: SoalRow = {
        Tipe_Soal: "MATCHING",
        Teks_Soal:
          stimHtml(g.stim) +
          "Pasangkan pernyataan pada Kolom A dengan jawaban yang tepat pada Kolom B!" +
          (withKeys ? "" : refList(g.choices)),
      };
      chunk.forEach((p, k) => ((row as Record<string, unknown>)[`Opsi_${LETTERS[k]}`] = p.text));
      drafts.push({ row, pairs: chunk.length, num: g.items[0]?.num ?? 0 });
    }
  }

  // urutkan sesuai nomor di dokumen
  drafts.sort((a, b) => a.num - b.num);
  for (const d of drafts) out.push(d.row);

  // ── bobot: tiap soal = 1 butir, tiap pasangan menjodohkan = 1 butir ──
  const units = drafts.reduce((n, d) => n + (d.row.Tipe_Soal === "MATCHING" ? d.pairs ?? 1 : 1), 0);
  if (!withKeys) {
    // skor diisi guru sendiri di Excel
  } else if (totalBobot && units) {
    let base = Math.floor(totalBobot / units);
    let rem = totalBobot - base * units;
    if (base < 1) {
      warnings.push(`Jumlah butir soal (${units}) melebihi total bobot ${totalBobot}; tiap butir diberi bobot 1.`);
      base = 1;
      rem = 0;
    }
    let idx = 0;
    const next = () => base + (idx++ < rem ? 1 : 0);
    for (const d of drafts) {
      if (d.row.Tipe_Soal === "MATCHING") {
        for (const L of LETTERS) {
          const key = `Opsi_${L}` as const;
          if (d.row[key]) d.row[key] = `${d.row[key]} | ${next()}`;
        }
      } else d.row.Skor = next();
    }
  } else {
    for (const d of drafts) {
      if (d.row.Tipe_Soal === "MATCHING") {
        for (const L of LETTERS) {
          const key = `Opsi_${L}` as const;
          if (d.row[key]) d.row[key] = `${d.row[key]} | 5`;
        }
      } else d.row.Skor = 2;
    }
  }

  if (!out.length) {
    warnings.push(
      "Tidak ada soal yang terbaca. Pastikan soal diberi nomor manual (1., 2., …) dan dikelompokkan per bagian, mis. “A. PILIHAN GANDA”.",
    );
  }

  const counts: WordSoalResult["counts"] = {
    MULTIPLE_CHOICE: 0, MULTIPLE_CHOICE_COMPLEX: 0, MATCHING: 0, ESSAY: 0, TRUE_FALSE: 0,
  };
  for (const r of out) counts[r.Tipe_Soal]++;
  return { rows: out, warnings, counts };
}

export async function convertWordSoal(
  buffer: Buffer | Uint8Array,
  totalBobot: number | null = 100,
  withKeys = false,
): Promise<WordSoalResult> {
  return parseWordBlocks(await readDocxBlocks(buffer), totalBobot, withKeys);
}

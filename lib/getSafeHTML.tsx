import { FilterXSS } from "xss";

/**
 * Membersihkan HTML soal sebelum ditampilkan dengan dangerouslySetInnerHTML.
 *
 * Sebelumnya fungsi ini TIDAK membersihkan apa pun saat berjalan di server
 * (SSR), dan satu halaman penilaian guru bahkan menampilkan teks soal mentah.
 * Teks soal bisa berasal dari impor Excel / guru lain, sehingga HTML seperti
 * <img src=x onerror=...> bisa berjalan di sesi guru atau admin (XSS).
 *
 * Sekarang server dan browser memakai sanitizer yang sama (allowlist), jadi
 * hasilnya identik dan aman di kedua sisi.
 */

const COMMON_ATTRS = ["class", "dir", "style", "data-type", "data-latex"];

const WHITELIST: Record<string, string[]> = {
  p: COMMON_ATTRS,
  div: COMMON_ATTRS,
  span: COMMON_ATTRS,
  br: [],
  hr: [],
  strong: COMMON_ATTRS,
  b: COMMON_ATTRS,
  em: COMMON_ATTRS,
  i: COMMON_ATTRS,
  u: COMMON_ATTRS,
  s: COMMON_ATTRS,
  sub: COMMON_ATTRS,
  sup: COMMON_ATTRS,
  code: COMMON_ATTRS,
  pre: COMMON_ATTRS,
  blockquote: COMMON_ATTRS,
  ul: COMMON_ATTRS,
  ol: [...COMMON_ATTRS, "start"],
  li: COMMON_ATTRS,
  h1: COMMON_ATTRS,
  h2: COMMON_ATTRS,
  h3: COMMON_ATTRS,
  h4: COMMON_ATTRS,
  table: COMMON_ATTRS,
  thead: COMMON_ATTRS,
  tbody: COMMON_ATTRS,
  tr: COMMON_ATTRS,
  th: [...COMMON_ATTRS, "colspan", "rowspan"],
  td: [...COMMON_ATTRS, "colspan", "rowspan"],
  img: ["src", "alt", "width", "height", ...COMMON_ATTRS],
  a: ["href", "title", ...COMMON_ATTRS],
};

const filter = new FilterXSS({
  whiteList: WHITELIST,
  // tag di luar daftar dibuang (isi teksnya tetap), kecuali tag berbahaya yang
  // dibuang beserta isinya
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed", "svg"],
});

export const getSafeHTML = (html: string): string => {
  if (typeof html !== "string" || html === "") return "";
  return filter.process(html);
};

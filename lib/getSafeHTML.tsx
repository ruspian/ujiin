import DOMPurify from "dompurify";

export const getSafeHTML = (html: string) => {
  // Kalau di client, jalankan DOMPurify
  if (typeof window !== "undefined") {
    return DOMPurify.sanitize(html);
  }
  // Kalau di server, balikin html mentah atau kosong
  return html;
};

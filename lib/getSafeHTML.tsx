import DOMPurify from "dompurify";

export const getSafeHTML = (html: string) => {
  if (typeof window !== "undefined") {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true, mathMl: true, svg: true },
      ADD_TAGS: [
        "math",
        "semantics",
        "mrow",
        "mi",
        "mo",
        "mn",
        "msup",
        "mfrac",
        "annotation",
        "svg",
        "path",
      ],
      ADD_ATTR: [
        "class",
        "style",
        "aria-hidden",
        "data-latex",
        "xmlns",
        "display",
        "d",
        "viewBox",
      ],
    });
  }
  return html;
};

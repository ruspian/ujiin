import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textDirection: {
      setTextDirection: (dir: "ltr" | "rtl" | "auto") => ReturnType;
    };
  }
}

export const TextDirection = Extension.create({
  name: "textDirection",

  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) => element.dir || null,
            renderHTML: (attributes) => {
              if (!attributes.dir) {
                return {};
              }
              return { dir: attributes.dir };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection:
        (dir) =>
        ({ chain }) => {
          return chain()
            .updateAttributes("paragraph", { dir })
            .updateAttributes("heading", { dir })
            .run();
        },
    };
  },
});

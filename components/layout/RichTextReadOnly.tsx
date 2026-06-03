"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Mathematics from "@tiptap/extension-mathematics";
import { useEffect, useMemo } from "react";
import { TextDirection } from "@/lib/TextDirection";
import "katex/dist/katex.min.css";

interface RichTextReadOnlyProps {
  content: string;
}

export default function RichTextReadOnly({ content }: RichTextReadOnlyProps) {
  const extensions = useMemo(
    () => [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: "max-h-20 w-auto rounded-md border border-gray-200 my-1 block",
        },
      }),
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
      }),
      TextDirection.configure(),
    ],
    [],
  );

  const editor = useEditor({
    editable: false,
    extensions,
    content: content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "text-sm text-gray-800 max-w-full break-words whitespace-pre-wrap font-soal " +
          "[&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:m-0 " +
          "[&_.katex]:text-blue-700 " +
          "[&_code]:break-words [&_code]:whitespace-pre-wrap [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded " +
          "[&_pre]:break-words [&_pre]:whitespace-pre-wrap [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded-md " +
          "[&_[dir=rtl]]:text-xl [&_[dir=rtl]]:leading-loose",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) return null;

  return <EditorContent editor={editor} className="w-full max-w-full" />;
}

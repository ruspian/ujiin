"use client";

import { RichTextEditorProps } from "@/types/question";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Strikethrough, List, ListOrdered } from "lucide-react";

export default function RichTextEditor({
  content,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[150px] px-4 py-3 text-sm text-gray-800 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:m-0",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="w-full bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("bold")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("italic")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("strike")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>

        <div className="w-px h-4 bg-gray-300 mx-1"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("bulletList")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("orderedList")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
      </div>

      <EditorContent editor={editor} className="bg-white cursor-text" />
    </div>
  );
}

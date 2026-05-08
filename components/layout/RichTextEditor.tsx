"use client";

import { useState, useRef } from "react";
import { RichTextEditorProps } from "@/types/question";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getCloudinarySignature } from "@/actions/cloudinary";

export default function RichTextEditor({
  content,
  onChange,
}: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class:
            "max-w-50 h-auto rounded-lg border border-gray-200 my-3 shadow-sm block",
        },
      }),
    ],
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar terlalu besar! Maksimal 5MB.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Mempersiapkan keamanan server...");

    try {
      const { timestamp, signature, apiKey, cloudName, folder } =
        await getCloudinarySignature();

      if (!cloudName || !apiKey) {
        throw new Error("Kredensial Cloudinary tidak ditemukan.");
      }

      toast.loading("Mengunggah gambar...", { id: toastId });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (response.ok && data.secure_url) {
        editor?.commands.setImage({ src: data.secure_url });
        toast.success("Gambar berhasil ditambahkan secara aman!", {
          id: toastId,
        });
      } else {
        throw new Error(data.error?.message || "Gagal upload ke Cloudinary");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message, { id: toastId });
      } else {
        toast.error("Terjadi kesalahan tidak dikenal saat mengunggah gambar.", {
          id: toastId,
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

        <div className="w-px h-4 bg-gray-300 mx-1"></div>

        <input
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-1.5 rounded-md transition-colors text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          title="Upload Image"
        >
          {isUploading ? (
            <Loader2 size={16} className="animate-spin text-blue-600" />
          ) : (
            <ImageIcon size={16} />
          )}
        </button>
      </div>

      <EditorContent editor={editor} className="bg-white cursor-text" />
    </div>
  );
}

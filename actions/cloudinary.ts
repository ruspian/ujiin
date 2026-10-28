"use server";

import { CloudinarySignature } from "@/types/cloudinary";
import crypto from "crypto";
import { auth } from "@/lib/auth";

export async function getCloudinarySignature(): Promise<CloudinarySignature> {
  // Tanpa login siapa pun bisa meminta tanda tangan lalu mengunggah file
  // sembarangan ke akun Cloudinary sekolah. Hanya admin/guru yang boleh.
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "GURU")
  ) {
    throw new Error("Akses ditolak!");
  }

  // Bikin timestamp waktu sekarang
  const timestamp = Math.round(new Date().getTime() / 1000).toString();
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    throw new Error("CLOUDINARY_API_SECRET belum di-setting");
  }

  const folder = "ujiin";

  const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

  // Enkripsi pake SHA-1
  const signature = crypto
    .createHash("sha1")
    .update(signatureString)
    .digest("hex");

  return {
    timestamp,
    signature,
    apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "",
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
    folder,
  };
}

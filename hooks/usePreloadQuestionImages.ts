"use client";

import { useEffect, useMemo } from "react";
import { extractImageUrls, preloadImages } from "@/lib/preload-images";

/**
 * Pra-muat gambar semua soal, urut mulai dari soal yang sedang dibuka.
 * Dijalankan ulang hanya bila daftar soal atau posisi soal berubah.
 */
export function usePreloadQuestionImages(
  questions: unknown[],
  currentIndex: number,
  enabled = true,
) {
  const perQuestion = useMemo(
    () => questions.map((q) => extractImageUrls(q)),
    [questions],
  );

  useEffect(() => {
    if (!enabled || perQuestion.length === 0) return;
    // soal sekarang dulu, lalu ke depan, lalu yang sudah lewat
    const order = [
      ...perQuestion.slice(currentIndex),
      ...perQuestion.slice(0, currentIndex),
    ].flat();
    return preloadImages([...new Set(order)]);
  }, [perQuestion, currentIndex, enabled]);
}

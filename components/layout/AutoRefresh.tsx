"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({
  interval = 5000,
}: {
  interval?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    // tarik data terbaru setiap 5 detik
    const timer = setInterval(() => {
      router.refresh();
    }, interval);

    return () => clearInterval(timer);
  }, [router, interval]);

  return null;
}

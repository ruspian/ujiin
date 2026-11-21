import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DownloadAplikasi from "@/components/layout/DownloadAplikasi";
import { DOWNLOAD_LINKS } from "@/lib/download-links";

describe("DownloadAplikasi", () => {
  it("tiap tombol menuju berkasnya sendiri", () => {
    render(<DownloadAplikasi />);
    expect(screen.getByText("Unduh Aplikasi Ujiin")).toBeTruthy();
    const href = (label: string) =>
      screen.getByRole("link", { name: `Unduh untuk ${label}` }).getAttribute("href");
    expect(href("Android")).toBe(DOWNLOAD_LINKS.android);
    expect(href("Windows")).toBe(DOWNLOAD_LINKS.windows);
    expect(href("Linux")).toBe(DOWNLOAD_LINKS.linux);
    expect(new Set([href("Android"), href("Windows"), href("Linux")]).size).toBe(3);
  });
});

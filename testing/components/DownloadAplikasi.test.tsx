import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DownloadAplikasi from "@/components/layout/DownloadAplikasi";
import { RELEASES_URL } from "@/lib/download-links";

describe("DownloadAplikasi", () => {
  it("menampilkan tiga platform dengan tautan ke rilis", () => {
    render(<DownloadAplikasi />);
    expect(screen.getByText("Unduh Aplikasi Ujiin")).toBeTruthy();
    for (const t of ["Android", "Windows", "Linux"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    for (const a of links) {
      expect(a.getAttribute("href")).toBe(RELEASES_URL);
      expect(a.getAttribute("target")).toBe("_blank");
    }
  });
});

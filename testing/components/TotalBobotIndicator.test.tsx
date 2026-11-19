import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TotalBobotIndicator from "@/components/layout/TotalBobotIndicator";

describe("TotalBobotIndicator", () => {
  it("menandai pas bila total 100", () => {
    render(<TotalBobotIndicator totalBobot={100} jumlahSoal={25} />);
    expect(screen.getByText(/Pas 100/)).toBeTruthy();
  });
  it("menunjukkan kekurangan", () => {
    render(<TotalBobotIndicator totalBobot={60} jumlahSoal={30} />);
    expect(screen.getByText("Kurang 40 poin")).toBeTruthy();
  });
  it("menunjukkan kelebihan", () => {
    render(<TotalBobotIndicator totalBobot={130} jumlahSoal={13} />);
    expect(screen.getByText("Kelebihan 30 poin")).toBeTruthy();
  });
});

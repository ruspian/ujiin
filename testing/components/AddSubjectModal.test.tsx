import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import AddSubjectModal from "@/components/layout/AddSubjectModal";
import { createSubject } from "@/actions/subject";
import { toast } from "sonner";

// 1. MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/subject", () => ({
  createSubject: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - AddSubjectModal (Form Action Mode)", () => {
  let setIsModalOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // Data tiruan relasi yang solid
  const mockTeachers = [{ id: "t-1", name: "Budi Santoso, S.Pd" }];
  const mockClasses = [
    { id: "cls-1", name: "10 RPL 1" },
    { id: "cls-2", name: "10 RPL 2" },
  ];
  const mockReligions = [{ id: "rel-1", name: "Islam" }];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmittingState = false) =>
    render(
      <AddSubjectModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={isSubmittingState}
        setIsSubmitting={setIsSubmittingMock}
        teachers={mockTeachers}
        classes={mockClasses}
        religions={mockReligions}
      />,
    );

  // SKENARIO 1: RENDERING & RELASI DATA

  test("Harus sukses merender form input dan seluruh daftar relasi checkbox", () => {
    const { getByText, container } = renderModal();

    expect(getByText("Tambah Mata Pelajaran")).toBeInTheDocument();

    // Verifikasi Input Teks & Select
    expect(container.querySelector('input[name="name"]')).toBeInTheDocument();
    expect(
      container.querySelector('select[name="religionId"]'),
    ).toBeInTheDocument();

    // Verifikasi data opsi render dengan benar
    expect(getByText("Islam")).toBeInTheDocument();
    expect(getByText("Budi Santoso, S.Pd")).toBeInTheDocument();
    expect(getByText("10 RPL 1")).toBeInTheDocument();
    expect(getByText("10 RPL 2")).toBeInTheDocument();
  });

  // SKENARIO 2: AKSI BATAL DAN PENUTUPAN MODAL

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = renderModal();

    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);

    const tombolX = getAllByRole("button")[0];
    if (!tombolX) throw new Error("Tombol X tidak ditemukan di DOM");
    fireEvent.click(tombolX);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
  });

  // SKENARIO 3: SUCCESS FLOW DENGAN MULTIPLE CHECKBOXES

  test("Harus sukses mengirim data mapel dengan multi-relasi, menampilkan toast, dan menutup modal", async () => {
    vi.mocked(createSubject).mockResolvedValue({
      success: true,
      message: "Mata Pelajaran berhasil ditambahkan!",
    });

    const { getByRole, getByText, container } = renderModal();

    const inputName = container.querySelector('input[name="name"]');
    const selectReligion = container.querySelector('select[name="religionId"]');
    const tombolSimpan = getByRole("button", { name: /simpan mapel/i });

    if (!inputName || !selectReligion) {
      throw new Error("Elemen input tidak ditemukan di DOM");
    }

    // 1. Isi input dasar
    fireEvent.change(inputName, { target: { value: "Pemrograman Web" } });
    fireEvent.change(selectReligion, { target: { value: "rel-1" } });

    // 2. Klik text label untuk mencentang checkbox Guru & Kelas secara ajaib (simulasi native browser)
    fireEvent.click(getByText("Budi Santoso, S.Pd"));
    fireEvent.click(getByText("10 RPL 1"));
    fireEvent.click(getByText("10 RPL 2"));

    // Pastikan checkbox-nya beneran nyala (opsional tapi nambah kekokohan tes)
    const checkboxGuru = container.querySelector(
      'input[name="teacherIds"][value="t-1"]',
    ) as HTMLInputElement;
    expect(checkboxGuru.checked).toBe(true);

    // 3. Eksekusi pengiriman form menggunakan act()
    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    // 4. Verifikasi Loading State diangkat
    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);

    // 5. Pastikan efek pasca-aksi (toast & penutupan) ter-trigger sempurna
    await waitFor(() => {
      expect(createSubject).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Mata Pelajaran berhasil ditambahkan!",
      );
      expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
    });
  });

  test("Harus merender tombol dalam kondisi terkunci dengan teks 'Menyimpan...' saat isSubmitting = true", () => {
    const { getByRole, getByText } = renderModal(true); // Lempar state true

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });

    expect(getByText("Menyimpan...")).toBeInTheDocument();
    expect(tombolLoading).toBeDisabled();
  });

  // SKENARIO 4: ERROR HANDLING SERVER ACTION

  test("Harus sukses menampilkan pesan error jika terjadi kegagalan di server (misal: duplikat mapel)", async () => {
    vi.mocked(createSubject).mockResolvedValue({
      success: false,
      message: "Nama mata pelajaran sudah ada!",
    });

    const { getByRole, getByText, container } = renderModal();

    const inputName = container.querySelector('input[name="name"]');
    const tombolSimpan = getByRole("button", { name: /simpan mapel/i });

    if (!inputName) throw new Error("Input nama mapel tidak ditemukan");

    // Simulasi data bentrok
    fireEvent.change(inputName, { target: { value: "Matematika" } });
    fireEvent.click(getByText("Budi Santoso, S.Pd"));

    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Nama mata pelajaran sudah ada!",
      );
      expect(setIsModalOpenMock).not.toHaveBeenCalled(); // Modal tetap terbuka bos!
    });
  });
});

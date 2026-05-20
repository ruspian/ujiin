import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import EditUserModal from "@/components/layout/EditUserModal"; // Sesuaikan path komponen lu bos!
import { updateUser } from "@/actions/user";
import { toast } from "sonner";
import { EditUserModalProps } from "@/types/user.admin";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/user", () => ({
  updateUser: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - EditUserModal", () => {
  let setIsModalEditOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // 🔥 Casting murni menggunakan kontrak interface asli tanpa 'any'
  const mockUserData = {
    id: "usr-101",
    name: "Budi Santoso",
    username: "budiguru123",
    role: "GURU",
  } as unknown as EditUserModalProps["user"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalEditOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmitting = false) =>
    render(
      <EditUserModal
        user={mockUserData}
        isSubmitting={isSubmitting}
        setIsModalEditOpen={setIsModalEditOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL & VALUE DEFAULT
  // ==========================================
  test("Harus sukses merender judul modal, default value form, dan hidden input ID", () => {
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Edit Pengguna")).toBeInTheDocument();

    // Verifikasi hidden input ID
    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("usr-101");

    // Verifikasi default value nama lengkap via attribute selector (kebal dari unlinked label)
    const inputName = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    expect(inputName).toBeInTheDocument();
    expect(inputName.value).toBe("Budi Santoso");

    // Verifikasi default value username
    const inputUsername = container.querySelector(
      'input[name="username"]',
    ) as HTMLInputElement;
    expect(inputUsername).toBeInTheDocument();
    expect(inputUsername.value).toBe("budiguru123");

    // Verifikasi default value role select box
    const selectRole = container.querySelector(
      'select[name="role"]',
    ) as HTMLSelectElement;
    expect(selectRole).toBeInTheDocument();
    expect(selectRole.value).toBe("GURU");

    // Pastikan password kosong di awal
    const inputPassword = container.querySelector(
      'input[name="password"]',
    ) as HTMLInputElement;
    expect(inputPassword).toBeInTheDocument();
    expect(inputPassword.value).toBe("");

    expect(getByRole("button", { name: /simpan data/i })).not.toBeDisabled();
  });

  // ==========================================
  // SKENARIO 2: AKSI BATAL ATAU TUTUP
  // ==========================================
  test("Harus memanggil setIsModalEditOpen(false) saat tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = renderModal();

    // Klik tombol Batal
    fireEvent.click(getByRole("button", { name: /batal/i }));
    expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);

    // Klik tombol X (tombol paling atas di modal)
    const tombolX = getAllByRole("button")[0];
    if (tombolX) fireEvent.click(tombolX);
    expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW (UPDATE BERHASIL)
  // ==========================================
  test("Harus memicu Server Action, merubah state loading, dan menampilkan toast sukses", async () => {
    vi.mocked(updateUser).mockResolvedValue({
      success: true,
      message: "Data pengguna berhasil diperbarui!",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    // Kirim event submit langsung ke form element untuk menghindari JSDOM button click block
    await act(async () => {
      fireEvent.submit(formElement);
    });

    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);
    expect(updateUser).toHaveBeenCalled();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Data pengguna berhasil diperbarui!",
      );
      expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus menampilkan toast error jika Server Action mengembalikan respons gagal", async () => {
    vi.mocked(updateUser).mockResolvedValue({
      success: false,
      message: "Gagal memperbarui! Username sudah dipakai pengguna lain.",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    await act(async () => {
      fireEvent.submit(formElement);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal memperbarui! Username sudah dipakai pengguna lain.",
      );
      expect(setIsModalEditOpenMock).not.toHaveBeenCalled(); // Modal tetap terbuka
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menyimpan...' saat isSubmitting bernilai true", () => {
    // Injeksi state dari luar tanpa memicu loop JSDOM
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menyimpan...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });
    expect(tombolLoading).toBeDisabled();
  });
});

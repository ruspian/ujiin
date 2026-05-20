import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import AddUserModal from "@/components/layout/AddUserModal";
import { createUser } from "@/actions/user";
import { toast } from "sonner";

// 1. MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/user", () => ({
  createUser: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - AddUserModal (Form Action Mode)", () => {
  let setIsModalOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmittingState = false) =>
    render(
      <AddUserModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={isSubmittingState}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // SKENARIO 1: RENDERING KOMPONEN UTUH

  test("Harus sukses merender form input untuk data pengguna dan judul modal", () => {
    const { getByText, container } = renderModal();

    expect(getByText("Tambah Pengguna")).toBeInTheDocument();

    // Gunakan querySelector berbasis name agar lolos dari validasi strict A11y RTL
    const inputName = container.querySelector('input[name="name"]');
    const inputUsername = container.querySelector('input[name="username"]');
    const selectRole = container.querySelector('select[name="role"]');
    const inputPassword = container.querySelector('input[name="password"]');

    expect(inputName).toBeInTheDocument();
    expect(inputUsername).toBeInTheDocument();
    expect(selectRole).toBeInTheDocument();
    expect(inputPassword).toBeInTheDocument();
  });

  // SKENARIO 2: AKSI BATAL DAN PENUTUPAN MODAL

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = renderModal();

    // Klik tombol Batal
    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);

    // Klik tombol silang X (berada di index 0)
    const tombolX = getAllByRole("button")[0];
    if (!tombolX) throw new Error("Tombol X tidak ditemukan di DOM");
    fireEvent.click(tombolX);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
  });

  // SKENARIO 3: SUCCESS FLOW & SUBMIT BERHASIL

  test("Harus memicu fungsi setIsSubmitting, memanggil server action, memunculkan toast sukses, dan menutup modal", async () => {
    vi.mocked(createUser).mockResolvedValue({
      success: true,
      message: "Pengguna baru berhasil ditambahkan!",
    });

    const { getByRole, container } = renderModal();

    const inputName = container.querySelector('input[name="name"]');
    const inputUsername = container.querySelector('input[name="username"]');
    const selectRole = container.querySelector('select[name="role"]');
    const inputPassword = container.querySelector('input[name="password"]');
    const tombolSimpan = getByRole("button", { name: /simpan data/i });

    if (!inputName || !inputUsername || !selectRole || !inputPassword) {
      throw new Error("Input elemen tidak ditemukan di dalam DOM");
    }

    // 1. Simulasikan pengetikan data oleh pengguna
    fireEvent.change(inputName, { target: { value: "Budi Santoso, S.Pd" } });
    fireEvent.change(inputUsername, { target: { value: "budisantoso" } });
    fireEvent.change(selectRole, { target: { value: "GURU" } });
    fireEvent.change(inputPassword, {
      target: { value: "passwordRahasia123" },
    });

    // 2. Picu aksi submit menggunakan act + click untuk Form Action
    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    // 3. Verifikasi bahwa setIsSubmitting(true) dipanggil saat proses berjalan
    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);

    // 4. Pastikan efek akhir pasca-submit (server action, toast, penutupan modal) berjalan lancar
    await waitFor(() => {
      expect(createUser).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Pengguna baru berhasil ditambahkan!",
      );
      expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
    });
  });

  test("Harus sukses merender tombol dalam kondisi terkunci (disabled) jika isSubmitting = true", () => {
    const { getByRole, getByText } = renderModal(true); // Lempar state loading aktif

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });

    expect(getByText("Menyimpan...")).toBeInTheDocument();
    expect(tombolLoading).toBeDisabled();
  });

  // SKENARIO 4: ERROR HANDLING SERVER ACTION

  test("Harus sukses menampilkan pesan error jika server action gagal membuat pengguna", async () => {
    vi.mocked(createUser).mockResolvedValue({
      success: false,
      message: "Username sudah terdaftar di sistem!",
    });

    const { getByRole, container } = renderModal();

    const inputName = container.querySelector('input[name="name"]');
    const inputUsername = container.querySelector('input[name="username"]');
    // 🔥 Tambahkan selector untuk input password
    const inputPassword = container.querySelector('input[name="password"]');
    const tombolSimpan = getByRole("button", { name: /simpan data/i });

    if (!inputName || !inputUsername || !inputPassword) {
      throw new Error("Input elemen tidak ditemukan di dalam DOM");
    }

    // Isi seluruh form agar lolos validasi 'required' bawaan HTML5
    fireEvent.change(inputName, { target: { value: "Budi Santoso" } });
    fireEvent.change(inputUsername, { target: { value: "admin" } });
    fireEvent.change(inputPassword, { target: { value: "password123" } });

    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Username sudah terdaftar di sistem!",
      );
      expect(setIsModalOpenMock).not.toHaveBeenCalled();
    });
  });
});

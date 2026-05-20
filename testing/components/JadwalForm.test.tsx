import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import JadwalForm from "@/components/layout/JadwalForm"; // Sesuaikan path jika berbeda
import { createExam } from "@/actions/exam";
import { toast } from "sonner";
import { JadwalFormProps } from "@/types/exam";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/exam", () => ({
  createExam: vi.fn(),
  updateExam: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe("Pengujian Komponen UI - JadwalForm (Multi-step)", () => {
  // 🔥 Murni type casting dari interface asli bawaan, anti 'any'
  interface ExtendedJadwalFormProps extends JadwalFormProps {
    teachers: { id: string; name: string }[];
  }

  const mockSubjects = [{ id: "sbj-1", name: "Informatika" }];
  const mockClasses = [
    { id: "cls-1", name: "X RPL 1" },
    { id: "cls-2", name: "X RPL 2" },
  ];
  const mockExamTypes = [{ id: "type-1", name: "UH" }];
  const mockAcademicYears = [{ id: "acd-1", name: "2025/2026", active: true }];
  const mockTeachers = [{ id: "t-1", name: "Budi Santoso" }];

  const defaultProps: ExtendedJadwalFormProps = {
    // 🔥 PERBAIKAN: Gunakan 'as unknown as' untuk mem-bypass strict overlap checking
    subjects: mockSubjects as unknown as ExtendedJadwalFormProps["subjects"],
    classes: mockClasses as unknown as ExtendedJadwalFormProps["classes"],
    examTypes: mockExamTypes as unknown as ExtendedJadwalFormProps["examTypes"],
    academicYears:
      mockAcademicYears as unknown as ExtendedJadwalFormProps["academicYears"],
    teachers: mockTeachers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<ExtendedJadwalFormProps> = {}) =>
    render(<JadwalForm {...defaultProps} {...props} />);

  // ==========================================
  // SKENARIO 1: RENDERING AWAL (STEP 1)
  // ==========================================
  test("Harus sukses merender Step 1 (Info Dasar) dengan default values kosong", () => {
    const { getByText, getByRole, getByDisplayValue } = renderComponent();

    // Verifikasi berada di Step 1
    expect(getByText("Info Dasar")).toBeInTheDocument();
    expect(getByRole("button", { name: /selanjutnya/i })).toBeInTheDocument();

    // Verifikasi default durasi 0
    const durationInput = getByDisplayValue("0") as HTMLInputElement;
    expect(durationInput).toBeInTheDocument();
  });

  // ==========================================
  // SKENARIO 2: VALIDASI REQUIRED STEP 1
  // ==========================================
  test("Harus menahan navigasi ke Step 2 jika ada field required di Step 1 yang masih kosong", () => {
    const { getByRole } = renderComponent();

    // Klik tombol Selanjutnya tanpa mengisi form
    fireEvent.click(getByRole("button", { name: /selanjutnya/i }));

    // Verifikasi toast validasi klien muncul
    expect(toast.error).toHaveBeenCalledWith(
      "Harap isi semua kolom informasi dasar (yang ber-bintang)!",
    );
  });

  // ==========================================
  // SKENARIO 3: SUCCESS NAVIGATION TO STEP 2
  // ==========================================
  test("Harus berhasil berpindah ke Step 2 jika seluruh form dasar terisi dengan benar", () => {
    const { getByRole, getByPlaceholderText, getAllByRole, getByText } =
      renderComponent();

    // 1. Isi Judul
    fireEvent.change(getByPlaceholderText(/PTS Bahasa Indonesia/i), {
      target: { value: "UH 1 Informatika" },
    });

    // 2. Isi Dropdown Wajib (Mata Pelajaran, Kategori)
    const selects = getAllByRole("combobox") as HTMLSelectElement[];
    fireEvent.change(selects[0], { target: { value: "sbj-1" } }); // Subject
    fireEvent.change(selects[1], { target: { value: "type-1" } }); // ExamType

    // 3. Isi Tanggal
    // Karena input type="date" tidak punya placeholder, kita cari dari display valuenya yang kosong
    const dateInputs = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(dateInputs[0], { target: { value: "2026-05-20" } });

    // 4. Klik Lanjut
    fireEvent.click(getByRole("button", { name: /selanjutnya/i }));

    // 5. Verifikasi kita sudah di Step 2
    expect(getByText(/Centang kelas mana saja/i)).toBeInTheDocument();
    expect(getByRole("button", { name: /kembali/i })).toBeInTheDocument();
    expect(
      getByRole("button", { name: /simpan jadwal ujian/i }),
    ).toBeInTheDocument();
  });

  // ==========================================
  // SKENARIO 4: SUBMIT SUCCESS FLOW
  // ==========================================
  test("Harus sukses membuat jadwal, menavigasi, dan mereload halaman jika Step 2 divalidasi dengan benar", async () => {
    vi.mocked(createExam).mockResolvedValue({
      success: true,
      message: "Jadwal ujian berhasil disimpan!",
    });

    // Kita bypass Step 1 dengan menyuntikkan initialData penuh agar langsung valid
    const mockInitialData = {
      title: "Ujian Harian",
      subjectId: "sbj-1",
      examTypeId: "type-1",
      academicYearId: "acd-1",
      startTime: "2026-05-20T07:00:00",
      endTime: "2026-05-20T09:00:00",
      duration: 120,
      randomizeQuestions: true,
      showResult: false,
      classes: [], // Sengaja dikosongkan agar kita bisa simulasi klik di Step 2
    } as unknown as ExtendedJadwalFormProps["initialData"];

    const { getByRole, getByText } = renderComponent({
      initialData: mockInitialData,
    });

    // Lanjut ke Step 2 (karena data sudah lengkap)
    fireEvent.click(getByRole("button", { name: /selanjutnya/i }));

    // Pilih kelas
    fireEvent.click(getByText("X RPL 1"));

    // Submit
    fireEvent.click(getByRole("button", { name: /simpan jadwal ujian/i }));

    await waitFor(() => {
      expect(createExam).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Jadwal ujian berhasil disimpan!",
      );
      expect(mockPush).toHaveBeenCalledWith("/admin/jadwal");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengubah teks tombol menjadi Menyimpan... saat submit sedang diproses", async () => {
    // 🔥 PERBAIKAN MUTLAK: Buang 'any' ke neraka, ganti dengan tipe kembalian yang pasti!
    let resolvePromise!: (value: { success: boolean; message: string }) => void;

    vi.mocked(createExam).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const mockInitialData = {
      title: "Ujian Harian",
      subjectId: "sbj-1",
      examTypeId: "type-1",
      academicYearId: "acd-1",
      startTime: "2026-05-20T07:00:00",
      endTime: "2026-05-20T09:00:00",
      duration: 120,
      randomizeQuestions: true,
      showResult: false,
      classes: [{ id: "cls-1", name: "X RPL 1" }], // Sudah terisi agar bisa langsung disubmit
    } as unknown as ExtendedJadwalFormProps["initialData"];

    const { getByRole, getByText } = renderComponent({
      initialData: mockInitialData,
    });

    fireEvent.click(getByRole("button", { name: /selanjutnya/i }));

    const submitBtn = getByRole("button", { name: /simpan jadwal ujian/i });
    fireEvent.click(submitBtn);

    // Verifikasi teks rendering berubah
    await waitFor(() => {
      expect(getByText(/menyimpan.../i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });

    // Lepas kunci asinkronus
    await act(async () => {
      resolvePromise({ success: true, message: "OK" });
    });
  });
});

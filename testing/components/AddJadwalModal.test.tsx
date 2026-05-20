import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import AddJadwalModal from "@/components/layout/AddJadwalModal";
import { createExam } from "@/actions/exam";
import { toast } from "sonner";

// MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/exam", () => ({
  createExam: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - AddJadwalModal (Complex Form Mode)", () => {
  let setIsModalOpenMock: Mock<(open: boolean) => void>;

  const mockSubjects = [{ id: "sub-1", name: "Matematika" }];
  const mockExamTypes = [{ id: "et-1", name: "Ujian Akhir Semester" }];
  const mockClasses = [{ id: "cls-1", name: "XII RPL 1" }];
  const mockAcademicYears = [{ id: "ay-1", name: "2025/2026" }];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalOpenMock = vi.fn();
  });

  const renderModal = () =>
    render(
      <AddJadwalModal
        setIsModalOpen={setIsModalOpenMock}
        subjects={mockSubjects}
        examTypes={mockExamTypes}
        classes={mockClasses}
        academicYears={mockAcademicYears}
      />,
    );

  //  RENDERING & RELASI DATA

  test("Harus sukses merender seluruh opsi select dari relasi tabel master", () => {
    const { getByText, container } = renderModal();

    expect(getByText("Buat Jadwal Ujian")).toBeInTheDocument();

    // Gunakan querySelector berbasis atribut name form
    const selectSubject = container.querySelector('select[name="subjectId"]');
    expect(selectSubject).toBeInTheDocument();
    expect(getByText("Matematika")).toBeInTheDocument();

    const selectClassCheckbox = getByText("XII RPL 1");
    expect(selectClassCheckbox).toBeInTheDocument();
  });

  // VALIDASI KUSTOM (KELAS & WAKTU)

  test("Harus memblokir submit dan menampilkan toast error jika kelas belum dipilih", () => {
    const { getByRole } = renderModal();
    const tombolSimpan = getByRole("button", { name: /simpan jadwal/i });

    fireEvent.submit(tombolSimpan.closest("form")!);

    expect(toast.error).toHaveBeenCalledWith("Pilih minimal satu kelas!");
    expect(createExam).not.toHaveBeenCalled();
  });

  test("Harus memblokir submit jika durasi waktu tidak valid (waktu selesai mendahului waktu mulai)", () => {
    const { getByRole, getByText, container } = renderModal();

    // Pilih kelas
    fireEvent.click(getByText("XII RPL 1"));

    // Cari input time berdasarkan posisinya (karena tidak ada atribut name)
    const inputsTime = container.querySelectorAll('input[type="time"]');
    const inputsDate = container.querySelectorAll('input[type="date"]');

    const [inputStartDate, inputEndDate] = Array.from(inputsDate);
    const [inputStartTime, inputEndTime] = Array.from(inputsTime);

    // Set waktu terbalik
    fireEvent.change(inputStartDate, { target: { value: "2026-05-20" } });
    fireEvent.change(inputStartTime, { target: { value: "10:00" } });
    fireEvent.change(inputEndDate, { target: { value: "2026-05-20" } });
    fireEvent.change(inputEndTime, { target: { value: "08:00" } });

    const tombolSimpan = getByRole("button", { name: /simpan jadwal/i });
    fireEvent.submit(tombolSimpan.closest("form")!);

    expect(toast.error).toHaveBeenCalledWith(
      "Cek kembali pengaturan waktu. Jam selesai harus lebih dari jam mulai!",
    );
    expect(createExam).not.toHaveBeenCalled();
  });

  // SUCCESS FLOW DENGAN KALKULASI DURASI

  test("Harus sukses mengkalkulasi durasi otomatis, mengirim payload lengkap, menampilkan toast, dan menutup modal", async () => {
    let resolveAction: (value: {
      success: boolean;
      message: string;
    }) => void = () => {};
    vi.mocked(createExam).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    const { getByRole, getByText, container, getByPlaceholderText } =
      renderModal();

    // Isi Data Teks & Select
    fireEvent.change(container.querySelector('input[name="title"]')!, {
      target: { value: "PAS Matematika 2026" },
    });
    fireEvent.change(container.querySelector('select[name="subjectId"]')!, {
      target: { value: "sub-1" },
    });
    fireEvent.change(container.querySelector('select[name="examTypeId"]')!, {
      target: { value: "et-1" },
    });
    fireEvent.change(
      container.querySelector('select[name="academicYearId"]')!,
      { target: { value: "ay-1" } },
    );

    // Pilih Kelas
    fireEvent.click(getByText("XII RPL 1"));

    // Cari elemen input waktu
    const inputsTime = container.querySelectorAll('input[type="time"]');
    const inputsDate = container.querySelectorAll('input[type="date"]');
    const [inputStartDate, inputEndDate] = Array.from(inputsDate);
    const [inputStartTime, inputEndTime] = Array.from(inputsTime);

    // Set Waktu Valid (120 menit)
    fireEvent.change(inputStartDate, { target: { value: "2026-05-20" } });
    fireEvent.change(inputStartTime, { target: { value: "08:00" } });
    fireEvent.change(inputEndDate, { target: { value: "2026-05-20" } });
    fireEvent.change(inputEndTime, { target: { value: "10:00" } });

    // Pastikan input durasi otomatis terisi 120
    const inputDurasi = getByPlaceholderText(
      "Terisi otomatis...",
    ) as HTMLInputElement;
    expect(inputDurasi.value).toBe("120");

    // Picu Submit & Cek Loading
    const formElement = getByRole("button", { name: /simpan jadwal/i }).closest(
      "form",
    )!;
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(getByText("Menyimpan...")).toBeInTheDocument();
      expect(getByRole("button", { name: /menyimpan.../i })).toBeDisabled();
    });

    // Selesaikan Action
    resolveAction({ success: true, message: "Jadwal berhasil dibuat!" });

    await waitFor(() => {
      expect(createExam).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "PAS Matematika 2026",
          duration: 120,
          classes: ["cls-1"],
          startTime: "2026-05-20T08:00:00+08:00", // Pastikan offset timezone lu sama dengan string +08:00 di komponen asli
        }),
      );
      expect(toast.success).toHaveBeenCalledWith("Jadwal berhasil dibuat!");
      expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
    });
  });

  //  ERROR HANDLING SERVER ACTION

  test("Harus sukses menangani penolakan dari server (misal: bentrok jadwal)", async () => {
    vi.mocked(createExam).mockResolvedValue({
      success: false,
      message: "Jadwal kelas bentrok!",
    });

    const { getByRole, getByText, container } = renderModal();

    fireEvent.change(container.querySelector('input[name="title"]')!, {
      target: { value: "Crash Test" },
    });
    fireEvent.click(getByText("XII RPL 1"));

    const inputsTime = container.querySelectorAll('input[type="time"]');
    const inputsDate = container.querySelectorAll('input[type="date"]');
    fireEvent.change(inputsDate[0], { target: { value: "2026-05-20" } });
    fireEvent.change(inputsTime[0], { target: { value: "08:00" } });
    fireEvent.change(inputsDate[1], { target: { value: "2026-05-20" } });
    fireEvent.change(inputsTime[1], { target: { value: "09:00" } });

    fireEvent.submit(
      getByRole("button", { name: /simpan jadwal/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Jadwal kelas bentrok!");
      expect(setIsModalOpenMock).not.toHaveBeenCalled();
    });
  });
});

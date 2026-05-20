import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import LoginForm from "@/components/layout/LoginForm"; // Sesuaikan path jika berbeda
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { loginSchema } from "@/schemas/loginSchema";

// ==========================================
// 1. MOCKING DEPENDENSI UTAMA
// ==========================================
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
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

// 🔥 Mocking Zod Schema agar kita bisa kontrol hasil validasi secara penuh
vi.mock("@/schemas/loginSchema", () => ({
  loginSchema: {
    safeParse: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - LoginForm", () => {
  let signInMock: Mock;
  let safeParseMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    signInMock = vi.mocked(signIn);
    safeParseMock = vi.mocked(loginSchema.safeParse);
  });

  const renderComponent = () => render(<LoginForm />);

  // ==========================================
  // SKENARIO 1: RENDERING AWAL
  // ==========================================
  test("Harus sukses merender input username, password, dan tombol masuk", () => {
    const { getByPlaceholderText, getByRole } = renderComponent();

    expect(getByPlaceholderText("Username")).toBeInTheDocument();
    expect(getByPlaceholderText("Password")).toBeInTheDocument();

    const submitBtn = getByRole("button", { name: /masuk/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();
  });

  // ==========================================
  // SKENARIO 2: ERROR VALIDASI ZOD (FORM KOSONG/SALAH)
  // ==========================================
  test("Harus memunculkan toast error dari Zod jika validasi form gagal, tanpa memanggil signIn", async () => {
    // 🔥 Casting suci menggunakan unknown tanpa setetes pun 'any'
    safeParseMock.mockReturnValue({
      success: false,
      error: {
        issues: [{ message: "Username wajib diisi minimal 3 karakter!" }],
      },
    } as unknown as ReturnType<typeof loginSchema.safeParse>);

    const { getByRole } = renderComponent();
    const form = getByRole("button", { name: /masuk/i }).closest("form")!;

    await act(async () => {
      fireEvent.submit(form);
    });

    // Verifikasi error ketangkap dan signIn tidak tereksekusi
    expect(toast.error).toHaveBeenCalledWith(
      "Username wajib diisi minimal 3 karakter!",
    );
    expect(signInMock).not.toHaveBeenCalled();
  });

  // ==========================================
  // SKENARIO 3: ERROR CREDENTIALS (AUTENTIKASI GAGAL)
  // ==========================================
  test("Harus memunculkan toast error jika respons signIn mengembalikan error kredensial", async () => {
    // 1. Luluskan validasi Zod
    safeParseMock.mockReturnValue({
      success: true,
      data: { username: "admin", password: "salahpassword" },
    } as unknown as ReturnType<typeof loginSchema.safeParse>);

    // 2. Gagalkan respons dari next-auth
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });

    const { getByRole } = renderComponent();
    const form = getByRole("button", { name: /masuk/i }).closest("form")!;

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      username: "admin",
      password: "salahpassword",
      redirect: false,
    });

    expect(toast.error).toHaveBeenCalledWith("Username atau password salah!");
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ==========================================
  // SKENARIO 4: SUCCESS FLOW (LOGIN BERHASIL)
  // ==========================================
  test("Harus sukses memanggil signIn, memunculkan toast sukses, dan menavigasi ke /dashboard", async () => {
    // 1. Luluskan validasi Zod
    safeParseMock.mockReturnValue({
      success: true,
      data: { username: "admin", password: "passwordBenar123" },
    } as unknown as ReturnType<typeof loginSchema.safeParse>);

    // 2. Sukseskan respons dari next-auth
    signInMock.mockResolvedValue({ ok: true, error: null });

    const { getByRole } = renderComponent();
    const form = getByRole("button", { name: /masuk/i }).closest("form")!;

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(toast.success).toHaveBeenCalledWith("Berhasil masuk!");
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
    expect(mockRefresh).toHaveBeenCalled();
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol submit saat proses loading (forceLoading test)", () => {
    // Render langsung dengan forceLoading true
    const { getByRole } = render(<LoginForm forceLoading={true} />);

    const submitBtn = getByRole("button", { name: /memeriksa data.../i });
    expect(submitBtn).toBeDisabled();
  });
});

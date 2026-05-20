export const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const formatDayMonth = (date: Date) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
};

export const extractDateAndTime = (dateObj: Date | string) => {
  const d = new Date(dateObj);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

export const formatTime = (isoString: string) => {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoString));
};

export const formatTimeWithOutSeconds = (isoString: string) => {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
};

export const formatTimeToInput = (dateString?: string | Date) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const formatDateToInput = (dateString?: string | Date) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function getWaktuSekarang() {
  // Ambil waktu saat ini
  const serverTime = new Date();

  // Konversi paksa ke waktu WITA
  const waktuLokal = new Date(
    serverTime.toLocaleString("en-US", { timeZone: "Asia/Makassar" }),
  );

  return waktuLokal;
}

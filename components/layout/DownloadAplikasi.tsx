import { RELEASES_URL } from "@/lib/download-links";

function AndroidLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="#3DDC84"
        d="M6 8h12v10a1 1 0 0 1-1 1h-1v3.5a1.5 1.5 0 0 1-3 0V19h-2v3.5a1.5 1.5 0 0 1-3 0V19H7a1 1 0 0 1-1-1V8zM2.5 9a1.5 1.5 0 0 1 3 0v6a1.5 1.5 0 0 1-3 0V9zm16 0a1.5 1.5 0 0 1 3 0v6a1.5 1.5 0 0 1-3 0V9zM6.2 7a6 6 0 0 1 11.6 0H6.2z"
      />
      <path
        stroke="#3DDC84"
        strokeWidth="1"
        strokeLinecap="round"
        d="M8.5 2.5 7.3 4.3M15.5 2.5l1.2 1.8"
      />
      <circle cx="9.5" cy="4.8" r=".9" fill="#fff" />
      <circle cx="14.5" cy="4.8" r=".9" fill="#fff" />
    </svg>
  );
}

function WindowsLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <g fill="#0078D4">
        <rect x="3" y="3" width="8.2" height="8.2" />
        <rect x="12.8" y="3" width="8.2" height="8.2" />
        <rect x="3" y="12.8" width="8.2" height="8.2" />
        <rect x="12.8" y="12.8" width="8.2" height="8.2" />
      </g>
    </svg>
  );
}

function LinuxLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <ellipse cx="12" cy="14" rx="6" ry="8" fill="#1f2937" />
      <circle cx="12" cy="7.5" r="4" fill="#1f2937" />
      <ellipse cx="12" cy="15.5" rx="3.7" ry="5.3" fill="#fff" />
      <circle cx="10.4" cy="6.7" r="1" fill="#fff" />
      <circle cx="13.6" cy="6.7" r="1" fill="#fff" />
      <circle cx="10.5" cy="6.8" r=".45" fill="#1f2937" />
      <circle cx="13.5" cy="6.8" r=".45" fill="#1f2937" />
      <path d="M10.6 8.4h2.8L12 10z" fill="#f59e0b" />
      <ellipse cx="8.2" cy="21.7" rx="2.4" ry="1" fill="#f59e0b" />
      <ellipse cx="15.8" cy="21.7" rx="2.4" ry="1" fill="#f59e0b" />
    </svg>
  );
}

const ITEMS = [
  { label: "Android", logo: <AndroidLogo /> },
  { label: "Windows", logo: <WindowsLogo /> },
  { label: "Linux", logo: <LinuxLogo /> },
];

export default function DownloadAplikasi() {
  return (
    <section id="unduh" aria-labelledby="unduh-judul" className="mt-20 text-center">
      <h2
        id="unduh-judul"
        className="text-xl font-bold tracking-tight text-gray-900"
      >
        Unduh Aplikasi Ujiin
      </h2>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {ITEMS.map(({ label, logo }) => (
          <a
            key={label}
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Unduh untuk ${label}`}
            className="inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-teal-400 hover:shadow-md"
          >
            {logo}
            {label}
          </a>
        ))}
      </div>
    </section>
  );
}

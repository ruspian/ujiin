export default function Credit({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-center text-xs leading-5 text-gray-500 ${className}`}
    >
      Dibuat dengan <span aria-label="cinta">🧡</span> oleh{" "}
      <span className="font-semibold text-gray-700">Ruspian Majid</span>
    </p>
  );
}

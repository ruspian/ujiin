import Credit from "@/components/layout/Credit";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-2 z-10 px-4">
        <Credit />
      </div>
    </>
  );
}

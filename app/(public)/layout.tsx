import Navbar from "@/components/layout/Navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isPublic={true} />
      <main>{children}</main>
    </div>
  );
}

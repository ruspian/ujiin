import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar isPublic={true} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

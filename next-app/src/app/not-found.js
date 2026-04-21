import { getSiteSettings } from "@/lib/site-settings";
import { getFirstPageSlug } from "@/lib/directus";
import Navbar from "@/components/Navbar/Navbar.server";
import Footer from "@/components/Footer";
import Link from "next/link";

export default async function NotFound() {
  const [setting, firstPageSlug] = await Promise.all([
    getSiteSettings(),
    getFirstPageSlug(),
  ]);

  return (
    <main className="font-prompt flex flex-col min-h-screen">
      <Navbar settings={setting} />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-8xl font-bold" style={{ color: setting?.primary_color ?? "#308E85" }}>
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-700">
          ไม่พบหน้าที่คุณต้องการ
        </h1>
        <p className="mt-2 text-gray-500">
          หน้าที่คุณกำลังมองหาอาจถูกลบ เปลี่ยนชื่อ หรือไม่มีอยู่
        </p>
        <Link
          href={firstPageSlug}
          className="mt-8 inline-block rounded-lg px-6 py-3 text-white font-medium transition hover:opacity-80"
          style={{ backgroundColor: setting?.primary_color ?? "#308E85" }}
        >
          กลับสู่หน้าหลัก
        </Link>
      </div>

      <Footer settings={setting} />
    </main>
  );
}

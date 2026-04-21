// components/NewsSection.jsx
"use client"; // <-- ต้องอยู่บรรทัดแรกสุด
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getLocale } from '@/utils/getLocale';

export default function Qoute() {
  const pathname = usePathname();
  const locale = getLocale(pathname);
  
    return (
        <section
            className="qoute bg-teal-50 py-16 px-8"
            style={{
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundImage: "url('/suweb/img/home/qoute.svg')"
            }}>
            <div className="max-w-7xl mx-auto">
                <h2 className="text-center text-4xl md:text-5xl font-medium mb-3 text-brand-500 font-silpakorn-70">{locale === 'en' ? '"Arts and Sciences: Creatively Building a Sustainable Nation."' : '"ศิลป์และศาสตร์ สร้างสรรค์ชาติอย่างยั่งยืน"'}</h2>
                <h4 className="text-center text-2xl md:text-3xl text-brand-300">{locale === 'en' ? 'Silpakorn people are creative thinkers.' : 'ชาวศิลปากรเป็นผู้มีความคิดสร้างสรรค์'}</h4>
            </div>
        </section>

    )
}
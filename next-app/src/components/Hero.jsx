'use client'

import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import { Pagination, Autoplay } from 'swiper/modules'
import '@/styles/hero.scss';
import { usePathname } from 'next/navigation'
import { getLocale } from '@/utils/getLocale';

function renderContentTH(content) {
  if (!content || !content.blocks) return null;
  return content.blocks.map((block, idx) => {
    if (block.type === 'header') {
      return (
        <h3 key={idx} className="text-4xl font-semibold mb-4 text-white">
          {block.data.text}
        </h3>
      );
    }
    if (block.type === 'paragraph') {
      return (
        <p key={idx} className="max-w-2xl text-xl text-white text-light">
          {block.data.text}
        </p>
      );
    }
    return null;
  });
}

const BASE_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL

export default function Hero() {
  const pathname = usePathname();
  const locale = getLocale(pathname)

  const [banners, setBanners] = useState([])

  useEffect(() => {
    fetch(`${BASE_URL}/items/banner?filter[status][_eq]=published`)
      .then(res => res.json())
      .then(res => setBanners(res?.data || []))
      .catch(() => setBanners([]))
  }, [])

  return (
    <section className="hero relative text-white text-center max-h-screen overflow-hidden">
      <div className='absolute right-4 top-4 z-10 flex flex-col gap-4 md:flex-row items-end'>
        <div className=''>
            <a href="https://admission.su.ac.th/" class="bg-brand-500 text-white hover:bg-brand-100 px-8 py-3 rounded inline-flex items-center border border-white" target="_blank">
                {locale === 'en' ? 'Apply now' : 'สมัครเรียน'}
            </a>
        </div>
        <div className=''>
            <a href="https://www-old.su.ac.th/" class="bg-white text-brand-500 hover:bg-brand-100 px-8 py-3 rounded inline-flex items-center" target="_blank">
                {locale === 'en' ? 'Original website' : 'กลับสู่เว็บไซต์เดิม'}
            </a>
        </div>
      </div>
      <Swiper
        pagination={{ clickable: true }}
        loop={true}
        modules={[Pagination, Autoplay]}
        autoplay={{
          delay: 4000,              // เวลาเปลี่ยนสไลด์ (ms)
          disableOnInteraction: false, // ไม่หยุดเมื่อผู้ใช้คลิก/ลาก
          pauseOnMouseEnter: true,  // หยุดเมื่อ hover
        }}
        className="w-full h-full"
      >
        {banners.length > 0 ? banners.map((item, idx) => (
          <SwiperSlide key={item.id || idx} className={`relative w-full h-[400px] md:h-[500px] lg:h-[600px] ${item.fade == 1 ? 'slide-fade' : ''}`}>
            <img
              src={item.image
                ? `${BASE_URL}/assets/${item.image}`
                : "/suweb/img/hero/hero1.webp"
              }
              className="w-full h-full object-cover"
              alt={item.button_title || `Slide ${idx + 1}`}
              fetchpriority={idx === 0 ? "high" : "auto"}
              loading={idx === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4 z-10">
              <h3 className="text-6xl font-medium mb-6 text-white">{locale === 'en' ? item.title_en:item.title_th}</h3>
              <p className="mb-6 max-w-2xl text-xl text-white text-light">
                {locale === 'en' ? renderContentTH(item.content_en) : renderContentTH(item.content_th)}
              </p>
              {(item.button_en || item.button_th) && (
                <a
                  href={item.url || "#"}
                  className="bg-white text-brand-500 hover:bg-brand-100 px-8 py-3 rounded inline-flex items-center"
                  target="_blank"
                >
                  <div className="">{locale === 'en' ? item.button_en : item.button_th}</div>
                </a>
              )}
            </div>
          </SwiperSlide>
        )) : (
          <SwiperSlide className="relative w-full h-[600px]">
            <img
              src="/suweb/img/hero/hero1.webp"
              className="w-full h-full object-cover"
              alt="Slide 1"
            />
          </SwiperSlide>
        )}
      </Swiper>
    </section>
  )
}
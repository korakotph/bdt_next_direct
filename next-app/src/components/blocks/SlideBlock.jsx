'use client'

import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Autoplay, Navigation } from 'swiper/modules'
import { getSiteSettings } from '@/lib/site-settings'

import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation' // ✅ สำคัญ

export default function SlideBlock({ item }) {

  const [settings, setSettings] = useState(null)

  useEffect(() => {
    getSiteSettings().then(setSettings)
  }, [])

  if (!item?.slide_img?.length) return null

  const slides = item.slide_img.map(slide =>
    `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${slide.directus_files_id}`
  )

  return (
    <section
      className={`${item.max_w || ''} ${item.bg_color || ''} ${item.text_color || ''} 
      ${item.align || 'text-left'} ${item.padding || ''} ${item.padding_y || ''} 
      ${item.padding_x || ''} mx-auto px-6 pt-8 relative`}
      style={{ '--swiper-theme-color': settings?.primary_color || '#fff'}}
    >

      <Swiper
        className="text-center"
        modules={[Pagination, Autoplay, Navigation]}
        pagination={item.pagination ? { clickable: true } : false}
        autoplay={
          item.autoplay
            ? { delay: item.autoplay_time || 4000 }
            : false
        }
        navigation={item.prev_next ?? true} // ✅ แก้ตรงนี้
        loop={item.loop ?? true}
      >

        {slides.map((img, index) => (
          <SwiperSlide key={index} className="">
            <img
              src={img}
              className="w-full h-auto object-contain mx-auto"
              // className="max-h-full max-w-full w-full object-contain mx-auto"
              alt=""
            />
          </SwiperSlide>
        ))}

      </Swiper>

    </section>
  )
}
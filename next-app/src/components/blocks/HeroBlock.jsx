'use client'

import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Autoplay } from 'swiper/modules'
import { getSiteSettings } from '@/lib/site-settings'

import 'swiper/css'
import 'swiper/css/pagination'

const isServer = typeof window === "undefined"

const BASE_URL = isServer
  ? process.env.DIRECTUS_INTERNAL_URL
  : process.env.NEXT_PUBLIC_DIRECTUS_URL

export default function HeroBlock() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)

  /* =========================
   * Load settings
   * ========================= */
  useEffect(() => {
    getSiteSettings().then(setSettings)
  }, [])

  const url = BASE_URL
    ? `${BASE_URL}/items/banner?filter[status][_eq]=published`
    : null

  /* =========================
   * Load banners
   * ========================= */
  useEffect(() => {
    if (!url) return

    const fetchBanners = async () => {
      try {
        const res = await fetch(url)
        const json = await res.json()
        setBanners(json.data || [])
      } catch (err) {
        console.error('Failed to fetch banners:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBanners()
  }, [url])

  if (loading) {
    return (
      <section className="h-[60vh] flex items-center justify-center">
        <p>กำลังโหลดแบนเนอร์...</p>
      </section>
    )
  }

  if (!banners.length) return null

  return (
    <section
      className="hero relative"
      style={{
        '--swiper-theme-color': settings?.primary_color || '#ffffff'
      }}
    >
      <Swiper
        modules={[Pagination, Autoplay]}
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000 }}
        loop
      >
        {banners.map(banner => (
          <SwiperSlide key={banner.id}>
            <div
              className="h-[500px] bg-cover bg-center flex items-center justify-center text-white"
              style={{
                backgroundImage: `url(${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${banner.image})`
              }}
            >
              {banner.title && (
                <h2 className="text-4xl font-bold text-center drop-shadow-lg">
                  {banner.title}
                </h2>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}

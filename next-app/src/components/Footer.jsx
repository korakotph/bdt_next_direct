'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { prerenderHtml } from '@/lib/prerenderHtml'

const DEFAULT_LOCALE = 'th'

export default async function Footer({ settings, lang }) {
  const pathname = usePathname()
  const year = new Date().getFullYear()

  const locale = lang;

  const t = {
    th: {
      rights: 'สงวนลิขสิทธิ์',
    },
    en: {
      rights: 'All rights reserved',
    },
  }

  const socials = [
    {
      name: 'facebook',
      icon: '/img/fb.svg',
      url: settings?.facebook_url,
    },
    {
      name: 'youtube',
      icon: '/img/yt.svg',
      url: settings?.youtube_url,
    },
    {
      name: 'instagram',
      icon: '/img/ig.svg',
      url: settings?.instagram_url,
    },
  ].filter(item => item.url)

  const ContentHtml = await prerenderHtml(settings?.footer_content);

  if (settings?.footer_theme == 2) {
    return (
      <footer
        className="text-white shadow-md"
        style={{ backgroundColor: settings?.footer_color }}
      >
        <div className={`max-w-${settings?.max_w_footer} mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-6 py-4`}>
          <div className="text-sm text-left md:text-left" style={{ color: settings?.footer_text_color }}>
            {settings?.footer_name}
          </div>
          <div className="text-sm text-right md:text-right" style={{ color: settings?.footer_text_color }} dangerouslySetInnerHTML={{ __html: ContentHtml }}/>
        </div>
      </footer>
    )
  }

  return (
    <footer
      className="text-white shadow-md"
      style={{ backgroundColor: settings?.footer_color }}
    >
      <div className={`max-w-${settings?.max_w_footer} mx-auto flex flex-col md:flex-row justify-center items-center gap-4 px-6 py-4`}>
        <div className="text-sm text-center md:text-left" style={{ color: settings?.footer_text_color }}>
          {settings?.footer_name}
        </div>
      </div>
    </footer>
  )
}

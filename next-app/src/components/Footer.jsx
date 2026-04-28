'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'

const DEFAULT_LOCALE = 'th'

export default function Footer({ settings, lang }) {
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

  if (settings?.footer_theme === 2) {
    const footerTextColor = settings?.footer_text_color ?? '#ffffff'
    const ContentHtml = settings?.footer_content ?? ''
    return (
      <footer
        className="text-white shadow-md"
        style={{ backgroundColor: settings?.footer_color }}
      >
        <style>{`.footer-content a { color: ${footerTextColor}; } .footer-content a:hover { color: ${footerTextColor}; opacity: 0.8; }`}</style>
        <div className={`${settings?.max_w_footer} flex flex-col md:flex-row justify-between items-center gap-4 px-6 py-4`}>
          <div className="text-sm text-center md:text-left" style={{ color: footerTextColor }}>
            {settings?.footer_name}
          </div>
          <div className="footer-content text-sm text-right md:text-right" style={{ color: footerTextColor }} dangerouslySetInnerHTML={{ __html: ContentHtml }}/>
        </div>
      </footer>
    )
  }

  return (
    <footer
      className="text-white shadow-md"
      style={{ backgroundColor: settings?.footer_color }}
    >
      <div className={`${settings?.max_w_footer} flex flex-col md:flex-row justify-center items-center gap-4 px-6 py-4`}>
        <div className="text-sm text-center md:text-left" style={{ color: settings?.footer_text_color }}>
          {settings?.footer_name}
        </div>
      </div>
    </footer>
  )
}

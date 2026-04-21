'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getLocale } from '@/utils/getLocale'

export default function CookieConsentModal() {
  const pathname = usePathname()
  const locale = getLocale(pathname)

  const [open, setOpen] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setOpen(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setOpen(false)
  }

  const rejectCookies = () => {
    localStorage.setItem('cookie-consent', 'rejected')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-system-700 mb-3">
          {locale === 'th' ? 'นโยบายการใช้คุกกี้' : 'Cookie Policy'}
        </h2>

        <p className="text-system-500 text-sm mb-4">
          {locale === 'th'
            ? 'เว็บไซต์มหาวิทยาลัยศิลปากรใช้คุกกี้เพื่อพัฒนาประสบการณ์การใช้งานของท่าน ท่านสามารถเลือกยอมรับหรือปฏิเสธการใช้คุกกี้ได้ '
            : 'The Silpakorn University website uses cookies to enhance user experience. You may choose to accept or reject cookies. '}
            <br/>
            <a
                href={`/suweb/${locale}/cookie`}
                className="text-sm text-brand-500 underline"
                target='_blank'
            >
                {locale === 'th'
                ? 'อ่านนโยบายการใช้คุกกี้'
                : 'Read Cookie Policy'}
            </a>
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2 justify-end">
            <button
              onClick={rejectCookies}
              className="px-4 py-2 text-sm rounded border border-system-200 text-system-500 hover:bg-system-50"
            >
              {locale === 'th' ? 'ปฏิเสธ' : 'Reject'}
            </button>

            <button
              onClick={acceptCookies}
              className="px-4 py-2 text-sm rounded bg-brand-500 text-white hover:bg-brand-700"
            >
              {locale === 'th' ? 'ยอมรับทั้งหมด' : 'Accept All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

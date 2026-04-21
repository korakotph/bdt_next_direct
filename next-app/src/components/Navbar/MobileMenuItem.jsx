'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleDown } from '@fortawesome/free-solid-svg-icons'

export default function MobileMenuItem({
  item,
  locale,
  buildUrl,
  isActive,
  getTitleByLang,
  settings
}) {
  const [open, setOpen] = useState(false)
  const hasChildren = item.children?.length > 0

  if (!hasChildren) {
    return (
      <Link
        href={buildUrl(locale, item.slug)}
        className={`block text-white ${
          isActive(item.slug) ? 'font-semibold' : 'opacity-80'
        }`}
      >
        {getTitleByLang(item)}
      </Link>
    )
  }

  return (
    <div className="flex flex-col">
      
      {/* Parent */}
      <button onClick={() => setOpen(!open)} className="flex justify-between items-center text-white">
        {getTitleByLang(item)}
        <FontAwesomeIcon icon={faAngleDown} className="w-3 h-3" />
      </button>

      {/* Children */}
      {open && (
        <div className="pl-4 mt-2 flex flex-col gap-2">
          {item.children.map(child => (
            <Link
              key={child.id}
              href={buildUrl(locale, child.slug)}
              className="text-white opacity-80"
            >
              {getTitleByLang(child)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

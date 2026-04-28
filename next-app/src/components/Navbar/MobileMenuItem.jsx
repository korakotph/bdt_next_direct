'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleDown } from '@fortawesome/free-solid-svg-icons'

export default function MobileMenuItem({
  item,
  buildUrl,
  isActive,
  settings
}) {
  const [open, setOpen] = useState(false)
  const hasChildren = item.children?.length > 0

  if (!hasChildren) {
    return (
      <Link
        href={buildUrl(item.slug)}
        className={`block text-white ${
          isActive(item.slug) ? 'font-semibold' : 'opacity-80'
        }`}
        style={{ color: settings?.text_color }}
      >
        {item.title}
      </Link>
    )
  }

  return (
    <div className="flex flex-col">
      <button onClick={() => setOpen(!open)} className="flex justify-between items-center" style={{ color: settings?.text_color }}>
        {item.title}
        <FontAwesomeIcon icon={faAngleDown} className="w-3 h-3" />
      </button>

      {open && (
        <div className="pl-4 mt-2 flex flex-col gap-2">
          {item.children.map(child => (
            <Link
              key={child.id}
              href={buildUrl(child.slug)}
              className="opacity-80"
              style={{ color: settings?.text_color }}
            >
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

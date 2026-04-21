'use client'
import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleDown } from '@fortawesome/free-solid-svg-icons'

export default function MenuItem({ item, buildUrl, isActive, settings }) {

  const hasChildren = item.children?.length > 0
//   console.log('MenuItem props:', { item, hasChildren })
  const [open, setOpen] = useState(false)

  const isExternal = item.external_url?.startsWith('http')
  
  if (!hasChildren) {
    if (isExternal) {
        return (
        <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-2 py-2 font-light hover:underline underline-offset-6"
            style={{ color: settings?.text_color }}
            onMouseEnter={e => (e.target.style.color = settings?.text_color_hover)}
            onMouseLeave={e => (e.target.style.color = settings?.text_color)}
        >
            {item.title}
        </a>
        )
    }

    return (
        <Link
            href={buildUrl(item.slug)}
            className={`block px-2 py-2 hover:underline underline-offset-6 ${
                isActive(item.slug) ? 'font-medium' : 'font-light'
            }`}
            style={{ backgroundColor: settings?.navbar_color,color: settings?.text_color }}
            onMouseEnter={e => (e.target.style.color = settings?.text_color_hover)}
            onMouseLeave={e => (e.target.style.color = settings?.text_color)}
        >
        {item.title}
        </Link>
    )
    }

  return (
    <div className="relative group">
        
        {/* Parent Link */}
        <Link
            href={buildUrl(item.slug)}
            className="px-4 py-2 hover:opacity-80 flex items-center gap-1 hover:underline underline-offset-6"
            style={{ color: settings?.text_color }}
            onMouseEnter={e => (e.target.style.color = settings?.text_color_hover)}
            onMouseLeave={e => (e.target.style.color = settings?.text_color)}
        >
            {item.title}
            <FontAwesomeIcon icon={faAngleDown} className="w-3 h-3" />
        </Link>

        {/* Dropdown */}
        <div
            // style={{ backgroundColor: settings?.navbar_color }}
            className="absolute left-0 top-full shadow-lg px-2 py-2
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    transition-all duration-200 w-full"
            style={{ backgroundColor: settings?.navbar_color,color: settings?.text_color }}
            onMouseEnter={e => (e.target.style.color = settings?.text_color_hover)}
            onMouseLeave={e => (e.target.style.color = settings?.text_color)}
        >
        {item.children.map((child, index) => (
            <MenuItem
                key={`${child.id}-${index}`}
                item={child}
                buildUrl={buildUrl}
                isActive={isActive}
                settings={settings}
            />
        ))}
        </div>
    </div>
    )
}
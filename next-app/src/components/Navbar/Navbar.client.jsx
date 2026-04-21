'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import '@/styles/navbar.scss'
import MenuItem from './MenuItem'
import MobileMenuItem from './MobileMenuItem'

export default function NavbarClient({ settings, menu}) {
  // console.log(settings);
  // console.log(settings?.first_page);

  // console.log('NavbarClient received props:', { settings, menu })
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const segments = pathname.split('/').filter(Boolean)
  const slug = segments[0] ?? 'home'

  const isActive = (itemSlug) => {
    return slug === itemSlug || (slug === 'home' && itemSlug === 'home')
  }

  const buildUrl = (targetSlug = 'home') => `/${targetSlug}`

  return (
    <nav className="sticky top-0 z-[100] shadow-md" 
      style={{ backgroundColor: settings?.navbar_color,
      }}
    >
      <div className={`px-6 h-20 flex justify-between items-center max-w-${settings?.max_w_navbar} mx-auto`}>
        {/* LOGO */}
        <Link 
          href={buildUrl(settings?.first_page)}
          className='flex jusify-center items-center'
          style={{ color: settings?.text_color }}
        >
          <img
            src={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${settings.logo}`}
            alt={settings.site_name}
            className="h-10"
          />
          <span className="ml-4 font-medium">{settings.site_name}</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-2">
          {menu.map(item => (
            <MenuItem
              key={item.id}
              item={item}
              buildUrl={buildUrl}
              isActive={isActive}
              settings={settings}
            />
          ))}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="menu-btn md:hidden flex flex-col justify-center items-center w-8 h-8 mr-0"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="block w-6 h-0.5 bg-white mb-1 transition-all duration-300 "></span>
          <span className="block w-6 h-0.5 bg-white mb-1 transition-all duration-300 "></span>
          <span className="block w-6 h-0.5 bg-white transition-all duration-300 "></span>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-brand-700 border-t border-white/10 px-6 py-4 space-y-4">

          {/* Menu */}
          <div className="flex flex-col gap-3">
            {menu.map(item => (
              <MobileMenuItem
                key={item.id}
                item={item}
                buildUrl={buildUrl}
                isActive={isActive}
                settings={settings}
              />
            ))}
          </div>

        </div>
      )}
    </nav>
  )
}

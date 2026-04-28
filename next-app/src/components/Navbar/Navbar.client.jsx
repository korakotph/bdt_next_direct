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

  const logoBlock = (
    <Link
      href={buildUrl(settings?.first_page)}
      className='flex justify-center items-center'
      style={{ color: settings?.text_color }}
    >
      {settings?.logo && (
        <img
          src={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${settings.logo}`}
          alt={settings?.site_name}
          className="h-10"
        />
      )}
      <span className="ml-4 font-medium">{settings.site_name}</span>
    </Link>
  )

  const desktopMenu = (
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
  )

  const mobileToggle = (
    <button
      className="menu-btn md:hidden flex flex-col justify-center items-center w-10 h-10 cursor-pointer"
      onClick={() => setMenuOpen(!menuOpen)}
      aria-label="Toggle menu"
    >
      <span className="block w-6 h-0.5 mb-1 transition-all duration-300" style={{ backgroundColor: settings?.text_color ?? '#ffffff' }}></span>
      <span className="block w-6 h-0.5 mb-1 transition-all duration-300" style={{ backgroundColor: settings?.text_color ?? '#ffffff' }}></span>
      <span className="block w-6 h-0.5 transition-all duration-300" style={{ backgroundColor: settings?.text_color ?? '#ffffff' }}></span>
    </button>
  )

  const mobileMenu = menuOpen && (
    <div
      className="md:hidden absolute w-full border-t border-white/10 px-6 py-4 space-y-4 z-[99] shadow-lg"
      style={{ backgroundColor: settings?.navbar_color }}
    >
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
  )

  if (settings?.header_theme == 2) {
    return (
      <nav className="sticky top-0 z-[100] shadow-md relative"
        style={{ backgroundColor: settings?.navbar_color }}
      >
        {/* Row 1: Logo + Site Name */}
        <div className={`px-6 h-16 flex justify-between items-center max-w-${settings?.max_w_navbar} mx-auto`}>
          {logoBlock}
          {mobileToggle}
        </div>

        {/* Row 2: Desktop Menu */}
        <div className={`hidden md:flex border-t border-white/10 px-6 max-w-${settings?.max_w_navbar} mx-auto`}>
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

        {mobileMenu}
      </nav>
    )
  }

  return (
    <nav className="sticky top-0 z-[100] shadow-md"
      style={{ backgroundColor: settings?.navbar_color }}
    >
      <div className={`px-6 h-20 flex justify-between items-center max-w-${settings?.max_w_navbar} mx-auto`}>
        {logoBlock}
        {desktopMenu}
        {mobileToggle}
      </div>
      {mobileMenu}
    </nav>
  )
}

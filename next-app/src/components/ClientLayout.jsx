'use client' // สำคัญมาก
import { useEffect } from 'react'
import Navbar from '@/components/Navbar/Navbar.client'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'
import Qoute from '@/components/Qoute'
import NewsPopup from '@/components/NewsPopup';

export default function ClientLayout({ children }) {
  return (
    <>
      <Navbar />
      <NewsPopup />
      {children}
      <Qoute />
      <Contact />
      <Footer />
    </>
  )
}

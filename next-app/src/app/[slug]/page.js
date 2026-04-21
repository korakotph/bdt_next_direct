import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/directus";
import { getSiteSettings } from "@/lib/site-settings";
import BlockRenderer from '@/components/blocks/BlockRenderer'
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar/Navbar.server";

export default async function Page({ params }) {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  const setting = await getSiteSettings();

  // console.log('Fetched site settings:', setting)

  if (!page) {
    notFound()
  }

  // console.log('Fetched page data:', page)

  const { blocks } = page

  return (
    <main className="font-prompt">
      <Navbar settings={setting}/>
      <BlockRenderer blocks={blocks}/>
      <Footer settings={setting}/>
    </main>
  )
}
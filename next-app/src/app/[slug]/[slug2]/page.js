import { notFound } from 'next/navigation'
import { getNewsDetailBySlug } from '@/lib/directus'
import { getSiteSettings } from '@/lib/site-settings'
import { prerenderHtml } from '@/lib/prerenderHtml'
import Navbar from '@/components/Navbar/Navbar.server'
import Footer from '@/components/Footer'

export default async function NewsDetailPage({ params }) {
  const { slug2 } = await params

  const [page, setting] = await Promise.all([
    getNewsDetailBySlug(slug2),
    getSiteSettings(),
  ])

  if (!page) notFound()

  const contentHtml = await prerenderHtml(page.content)

  return (
    <main className="font-prompt flex flex-col min-h-screen">
      <Navbar settings={setting} />

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <h1 className="text-3xl font-medium mb-6">
          {page.parent?.title}
        </h1>

        <article
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>

      <Footer settings={setting} />
    </main>
  )
}
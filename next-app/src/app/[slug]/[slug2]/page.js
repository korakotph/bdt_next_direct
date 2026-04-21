// app/[lang]/news/[slug2]/page.jsx
import { notFound } from 'next/navigation'
import { getNewsDetailBySlug } from '@/lib/directus'
import { prerenderHtml } from '@/lib/prerenderHtml'

export default async function NewsDetailPage({ params }) {
  const { slug2 } = await params

  const page = await getNewsDetailBySlug(slug2)
  if (!page) notFound()

  // 🔥 prerender + inject tailwind classes
  const contentHtml = await prerenderHtml(page.content)

  return (
    <div className="max-w-7xl mx-auto py-10">
      <h1 className="text-3xl font-medium mb-6">
        {page.parent?.title}
      </h1>

      <article
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  )
}
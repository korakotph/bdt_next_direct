import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeStringify from 'rehype-stringify'
import rehypeAddClasses from 'rehype-add-classes'

const INTERNAL_URL_PATTERN = /http:\/\/localhost:\d+/g
const PUBLIC_DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || ''

export async function prerenderHtml(html = '') {
  if (!html) return ''

  // แทนที่ localhost URL ที่อาจติดมาจาก content ในฐานข้อมูล
  html = html.replace(INTERNAL_URL_PATTERN, PUBLIC_DIRECTUS_URL)

  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeAddClasses, {
      h1: 'text-4xl font-base mt-8 mb-4',
      h2: 'text-3xl font-base mt-6 mb-3',
      h3: 'text-2xl font-light mt-4 mb-2',
      p: 'text-xl font-light leading-relaxed mb-4',
      img: 'rounded-xl my-6 w-full h-auto font-light',
      ul: 'list-disc pl-6 mb-4 font-light',
      ol: 'list-decimal pl-6 mb-4 font-light',
      li: 'mb-2 font-light',
      a: 'hover:underline hover:text-green-800 font-light',
      // a: 'text-green-600 underline hover:text-green-800'
    })
    .use(rehypeStringify)
    .process(html)

  return String(file)
}

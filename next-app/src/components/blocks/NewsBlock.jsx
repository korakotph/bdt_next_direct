'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL;


export default function NewsBlock({ item, lang }) {

  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  const limit = item?.limit || 4;
  let img_news_rounded = '';
  switch(item?.rounded_news) {
    case 'rounded-lg':
      img_news_rounded = 'rounded-t-lg';
      break;
    case 'rounded-md':
      img_news_rounded = 'rounded-t-md';
      break;
    case 'rounded-sm':
      img_news_rounded = 'rounded-t-sm';
      break;
    default:
      img_news_rounded = ''; // reset to default if invalid
  }

  const url_news = BASE_URL
  ? `${BASE_URL}/items/news?filter[status][_eq]=published&limit=${limit}`
  : null

  useEffect(() => {
    if (!url_news) return

    async function fetchNews() {
      try {
        const res = await fetch(url_news, { cache: 'no-store' })
        const json = await res.json()
        setNews(json.data || [])
      } catch (error) {
        console.error('Failed to fetch news:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [url_news])

  if (!item) return null

  return (
    <section 
      className={`${item?.padding || ''} ${item?.padding_y || ''} 
        ${item?.padding_x || ''} ${item?.align || ''} ${item?.max_w || ''} ${item?.gap || ''}`}
        style={item?.background_color ? { backgroundColor: item.background_color } : {}}
    >
      {/* title / content จาก block */}
      {item.content && (
        <h1
          className="text-4xl font-medium mb-4"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      )}

      {/* loading */}
      {loading && 
        <div className='text-center flex items-center justify-center gap-2 w-full'>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      }

      {/* news list */}
      {!loading && news.length > 0 && (
        <div className={`grid grid-cols-1 md:${item?.news_column || 'grid-cols-4'} ${item?.news_gap || 'gap-6'}`}>
          {news.map(n => (
            <Link
              key={n.id ?? n.slug}
              href={`/${lang}/news/${n.id}`}
              className="block hover:shadow-lg transition-shadow duration-200"
            >
              <div key={n.id} className={`${item?.rounded_news || ''} shadow`}>
                <img
                  src={`${BASE_URL}/assets/${n.image}`}
                  alt={n.title}
                  className={`w-full h-48 object-cover mb-2 ${img_news_rounded || ''}`}
                />
                <h4 className="text-xl font-medium mb-2 py-2 px-4">
                  {n.title}
                </h4>
                <h4 className="text-base px-2 pb-2 text-gray-600 px-4">
                  {n.subtitle}
                </h4>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && news.length === 0 && (
        <p>ยังไม่มีข่าว</p>
      )}
    </section>
  )
}

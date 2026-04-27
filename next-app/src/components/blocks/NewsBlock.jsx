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
  ? `${BASE_URL}/items/news?filter[status][_eq]=published&limit=${limit}&sort=-date_updated`
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
      className={`${item?.padding || ''} ${item?.padding_y || ''} mx-auto
        ${item?.padding_x || ''} ${item?.align || ''} max-w-${item?.max_w || ''} ${item?.gap || ''}`}
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
              href={`/news/${n.id}`}
              className="block hover:shadow-lg transition-shadow duration-200 h-full"
            >
              <div key={n.id} className={`${item?.rounded_news || ''} shadow flex flex-col h-full`}>
                <img
                  src={`${BASE_URL}/assets/${n.image}`}
                  alt={n.title}
                  className={`w-full h-48 object-cover mb-2 ${img_news_rounded || ''}`}
                />
                <div className="flex flex-col flex-1 px-4 py-2">
                  <h4 className="text-xl font-medium mb-2 line-clamp-2">
                    {n.title}
                  </h4>
                  <h4 className="text-base pb-2 text-gray-600 line-clamp-3 flex-1">
                    {n.subtitle}
                  </h4>
                  {n.date_updated && (
                    <p className="text-sm text-gray-400 pb-3 mt-auto">
                      {new Date(n.date_updated).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && news.length === 0 && (
        <p>ยังไม่มีข่าว</p>
      )}

      {/* ปุ่มดูข่าวทั้งหมด */}
      {!loading && item?.all_news_link && (
        <div className="flex justify-center mt-8">
          <Link
            target='_self'
            href={item.all_news_link}
            className="inline-block px-8 py-3 rounded-lg font-medium text-white transition hover:opacity-80"
            style={{ backgroundColor: item?.news_button || '#308E85' }}
          >
            ดูข่าวทั้งหมด
          </Link>
        </div>
      )}
    </section>
  )
}

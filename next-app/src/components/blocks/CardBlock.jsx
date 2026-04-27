'use client'

import { useEffect, useState } from 'react'

const BASE_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL

export default function CardBlock({ item }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  const url_news = BASE_URL
  ? `${BASE_URL}/items/${item.collection}`
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
    <section className={`max-w-${item.max_w || ''} mx-auto px-6 py-6 text-left`}>
      {/* title / content จาก block */}
      {/* {item.content && (
        <h1
          className="text-4xl font-medium mb-4"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      )} */}

      {/* loading */}
      {loading && 
        <div className='text-center flex items-center justify-center gap-2 w-full'>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      }

      {/* card list */}
      {!loading && news.length > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-${item?.column} ${item?.collection_gap || 'gap-4'}`}>
          {news.map(i => (
            <div key={i.id}>
              {i.link && (
                <>
                  <img
                    src={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${i.image}`}
                    alt={i.title}
                    className={`w-[${i?.width || 100}%] object-cover rounded-lg mx-auto`}
                  />
                  <a href={i.link} target="_blank" rel="noopener noreferrer">
                    <h4 className={`text-xl py-4 ${i.text_align}`} onMouseEnter={(e) => {
                        if (item.hover_color) {
                          e.currentTarget.style.color = item.hover_color
                        }
                        if (item.hover_underline) {
                          e.currentTarget.style.textDecoration = 'underline'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = ''
                        e.currentTarget.style.textDecoration = ''
                      }}>
                      {i.title}
                    </h4>
                  </a>
                </>
              )}
              {!i.link && (
                <>
                  <img
                    src={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${i.image}`}
                    alt={i.title}
                    className={`w-[${i?.width || 100}%] object-cover rounded-lg mx-auto`}
                  />
                  <h4 className={`text-xl py-4 ${i.text_align}`}>
                    {i.title}
                  </h4>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && news.length === 0 && (
        <p className='text-center'> 
          <svg className="mr-3 -ml-1 size-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          ไม่มีเนื้อหาที่แสดงผล
        </p>
      )}
    </section>
  )
}

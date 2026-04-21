'use client'

import { useEffect, useState } from 'react'

const isServer = typeof window === "undefined"

const BASE_URL = isServer
  ? process.env.DIRECTUS_INTERNAL_URL
  : process.env.NEXT_PUBLIC_DIRECTUS_URL

export default function TableBlock({ item, lang }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const url = BASE_URL
    ? `${BASE_URL}/items/${item.collection}?limit=-1`
    : null

  useEffect(() => {
    if (!url) return

    async function fetchData() {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json()
        setRows(json.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [url])

  if (!item) return null

  /* ---------- auto detect columns ---------- */
  const columns =
    item.fields?.length > 0
      ? item.fields
      : rows.length > 0
      ? Object.keys(rows[0]).filter(k => k !== 'id')
      : []

  /* ---------- render cell ---------- */
  function renderCell(value) {
    if (!value) return ''

    /* file (image/video/file id) */
    if (typeof value === 'string' && value.length === 36) {
      return (
        <img
          src={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${value}`}
          className="w-20 rounded"
          alt=""
        />
      )
    }

    /* relation object */
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value.title || value.name || value.id || JSON.stringify(value)
    }

    /* relation array */
    if (Array.isArray(value)) {
      return value
        .map(v =>
          typeof v === 'object'
            ? v.title || v.name || v.id
            : v
        )
        .join(', ')
    }

    return value.toString()
  }

  return (
    <section className={`${item.max_w || ''} mx-auto px-6 py-6`}>

      {/* title */}
      {item.content && (
        <h1
          className="text-3xl font-medium mb-4"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      )}

      {/* loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      )}

      {/* table */}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border rounded-lg">

            {/* header */}
            <thead className="bg-gray-100">
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    className="px-4 py-2 border text-left capitalize"
                  >
                    {col.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>

            {/* body */}
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {columns.map(col => (
                    <td key={col} className="px-4 py-2 border">
                      {renderCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}

    </section>
  )
}
export default function ImagesBlock({ item }) {
  if (!item) return null
  /* ---------- default values ---------- */
  const col = item?.column  ?? 1
  const align = item?.align ?? 'center'
  const rounded = item?.rounded ?? true

  /* ---------- grid column map ---------- */
  const colClassMap = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
  }

  const gridColClass = colClassMap[col] ?? 'md:grid-cols-1'

  /* ---------- images ---------- */
  const img = item; // หรือ item.items / item.gallery แล้วแต่ schema

  return (
    <section className={`max-w-${item.max_w || 'full'} ${item.bg_color || ''} ${item.text_color || ''} ${item.align || 'text-left'} ${item.padding || ''} ${item.padding_y || ''} ${item.padding_x || ''} mx-auto px-6 pt-8`}>
      <div
        className={`grid grid-cols-1 ${gridColClass} gap-4`}
        style={{ textAlign: align }}
      >
        <img
          src={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${img.image}`}
          alt={img.title || ''}
          className={`w-full object-cover mb-2 ${
            rounded ? 'rounded-lg' : ''
          }`}
          loading="lazy"
        />
      </div>
    </section>
  )
}

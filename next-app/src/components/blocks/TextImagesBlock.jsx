export default function TextImagesBlock({ item }) {
  if (!item) return null

  const tagClassMap = {
    h1: 'text-4xl font-medium',
    h2: 'text-3xl font-medium',
    h3: 'text-2xl font-medium',
    h4: 'text-xl font-medium',
    p: 'text-lg',
    div: 'text-base py-8',
  }

  const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'div']
  const Tag = ALLOWED_TAGS.includes(item.type.code) ? item.type.code : 'div'
  const className = tagClassMap[Tag] || 'text-base'

  /* ---------- option (safe) ---------- */
  let option = {}
  if (typeof item.option === 'object' && item.option !== null) {
    option = item.option
  } else if (typeof item.option === 'string') {
    try {
      option = JSON.parse(item.option)
    } catch {
      option = {}
    }
  }

  const col = option.col ?? 3
  const align = option.align ?? 'center'
  // const rounded = option.rounded ?? true

  /* ---------- grid column map ---------- */
  const colClassMap = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
  }

  const gridColClass = colClassMap[col] ?? 'md:grid-cols-3'

  /* ---------- images ---------- */
  const img = item; // หรือ item.items / item.gallery แล้วแต่ schema

  return (
    <section className="max-w-7xl mx-auto px-6 pt-8">
      <div
        className={`grid grid-cols-1 ${gridColClass} gap-4`}
        style={{ textAlign: align }}
      >
        <img
          src={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${img.image}`}
          alt={img.title || ''}
          className={`w-full object-cover mb-2`}
        />
        <Tag
          className={className}
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      </div>
    </section>
  )
}

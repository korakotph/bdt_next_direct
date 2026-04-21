export default function PdfBlock({ item }) {
  if (!item) return null

  // console.log('PdfBlock item:', item)

  /* ---------- default values ---------- */
  const col = item?.column ?? 1
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

  /* ---------- pdf file ---------- */
  const pdf = item?.file || item?.pdf || item?.document

  const pdfUrl =
    typeof pdf === 'string'
      ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${pdf}`
      : pdf?.id
      ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${pdf.id}`
      : null

  if (!pdfUrl) return null

  return (
    <section
      className={`${item.max_w || ''} ${item.bg_color || ''} ${item.text_color || ''} ${item.align || 'text-left'} ${item.padding || ''} ${item.padding_y || ''} ${item.padding_x || ''} mx-auto px-6 pt-8`}
    >
      <div
        className={`grid grid-cols-1 ${gridColClass} gap-4`}
        style={{ textAlign: align }}
      >
        <div className={`w-full ${rounded ? 'rounded-lg overflow-hidden' : ''}`}>
          
          {/* PDF Viewer */}
          <iframe
            src={pdfUrl}
            className="w-full h-[80vh]"
            title={item.title || 'PDF'}
          />

        </div>

        {/* Optional Download Button */}
        {/* <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline mt-2 inline-block"
        >
          ดาวน์โหลดไฟล์ PDF
        </a> */}

      </div>
    </section>
  )
}
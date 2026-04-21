export default function ExcelBlock({ item }) {
  console.log('ExcelBlock received item:', item)
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

  /* ---------- excel file ---------- */
  const excel = item?.file || item?.excel || item?.document

  const excelUrl =
    typeof excel === 'string'
      ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${excel}`
      : excel?.id
      ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${excel.id}`
      : null

  if (!excelUrl) return null

  return (
    <section
      className={`max-w-${item.max_w || ''} ${item.bg_color || ''} ${item.text_color || ''} ${item.align || 'text-left'} ${item.padding || ''} ${item.padding_y || ''} ${item.padding_x || ''} mx-auto px-6 pt-8`}
    >
      <div
        className={`grid grid-cols-1 ${gridColClass} gap-4`}
        style={{ textAlign: align }}
      >
        <div className={`w-full ${rounded ? 'rounded-lg overflow-hidden' : ''}`}>
          
          {/* Excel Viewer */}
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${excelUrl}`}
            className="w-full h-[80vh]"
            title={item.title || 'Excel'}
          />

        </div>

      </div>
    </section>
  )
}
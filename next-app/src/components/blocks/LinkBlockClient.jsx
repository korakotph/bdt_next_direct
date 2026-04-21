'use client'

export default function LinkBlockClient({ Tag, item, className }) {
  return (
    <Tag
      // style={{ transition: '0.1s' }}
      onMouseEnter={(e) => {
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
      }}
      className={className}
      dangerouslySetInnerHTML={{ __html: item.content }}
    />
  )
}
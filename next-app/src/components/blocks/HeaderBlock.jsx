export default function HeaderBlock({ item }) {
  if (!item) return null
  
  const tagClassMap = {
    h1: 'text-4xl',
    h2: 'text-3xl',
    h3: 'text-2xl',
    h4: 'text-xl',
    p: 'text-lg',
    div: 'text-base',
  }

  const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'div']
  const Tag = ALLOWED_TAGS.includes(item.type.code) ? item.type.code : 'div'
  const className = tagClassMap[Tag];

  return (
    <section 
      className={`
        mx-auto max-w-${item.max_w || ''} 
        ${item.bg_color || ''} 
        ${item.text_color || ''} 
        ${item.align || 'text-left'} 
        ${item.header_rounded || ''} 
        ${item.padding || ''} 
        ${item.padding_y || ''} 
        ${item.padding_x || ''}
        ${item.border || ''}
        ${item.border_left || ''}
        ${item.border_right || ''}
        ${item.border_top || ''}
        ${item.border_bottom || ''}`
      } 
      style={{
        backgroundColor: item.background_color || 'transparent',
        color: item.text_color || 'inherit',
        borderColor: item.border_color || 'transparent',
      }}
    >
      <Tag
        className={`
          ${item.font_weight || ''} 
          ${className} 
          ${item.underline || ''} 
          ${item.italic || ''} 
          ${item.text_indent || ''}`
        }
        dangerouslySetInnerHTML={{ __html: item.content }}
      />
    </section>
  )
}
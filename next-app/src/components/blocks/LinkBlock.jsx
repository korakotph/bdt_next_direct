'use client'
import LinkBlockClient from './LinkBlockClient'

export default function LinkBlock({ item }) {
  if (!item) return null
  
  const tagClassMap = {
    h1: 'text-4xl',
    h2: 'text-3xl',
    h3: 'text-2xl',
    h4: 'text-xl',
    p: 'text-lg',
    div: 'text-base',
  }

  const hoverColorMap = {
    red: 'hover:text-red-500',
    blue: 'hover:text-blue-500',
    green: 'hover:text-green-500',
  }

  const hoverUnderlineMap = {
    true: 'hover:underline',
    false: '',
  }

  // const option = JSON.parse(item.option || '{}');
  // console.log('Rendering HeaderBlock with item:', item);

  const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'div']
  const Tag = ALLOWED_TAGS.includes(item.header) ? item.header : 'div'
  const className = tagClassMap[Tag];
  // const hoverColorClass = hoverColorMap[item.hover_color] || ''
  // const hoverUnderlineClass = hoverUnderlineMap[item.hover_underline] || ''

  return (
    <section 
      className={`mx-auto max-w-${item.max_w || ''} 
        ${item.bg_color || ''} 
        ${item.text_color || ''} 
        ${item.align || 'text-left'} 
        ${item.padding || ''} 
        ${item.padding_y || ''} 
        ${item.padding_x || ''}
        font-${item.font_weight || 'base'}`
      }
    >
      <a href={item.href || '#'} target={item.target || '_self'}>
        <LinkBlockClient Tag={Tag} item={item} className={className} />
      </a>
    </section>
  )
}
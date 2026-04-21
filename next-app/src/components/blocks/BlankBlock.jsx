export default function BlankBlock({ item }) {
  if (!item) return null

  return (
    <section 
      style={item?.background_color ? { backgroundColor: item.background_color } : {}} 
      className={`${item?.padding || ''} ${item?.padding_y || ''} ${item?.padding_x || ''}
        ${item?.align ? `text-${item.align}` : ''}
      `}>
      
    </section>
  )
}
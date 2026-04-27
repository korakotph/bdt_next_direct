import { prerenderHtml } from '@/lib/prerenderHtml'

export default async function DivBlock({ item }) {
  // const item = block.block_items?.[0]
  if (!item) return null

  const ContentHtml = await prerenderHtml(item.box, { imgClass: 'rounded-xl my-6 max-w-full h-auto' });

  return (
    <section  style={item?.background_color ? { backgroundColor: item.background_color } : {}}>
      <div className={`${item?.padding || ''} ${item?.padding_x || ''} ${item?.padding_y || ''} ${item?.align || ''} max-w-${item?.max_w || ''} ${item?.gap || ''} 
            grid grid-cols-1 mx-auto`}>
        <div dangerouslySetInnerHTML={{ __html: ContentHtml }} />
      </div>
    </section>
  )
}
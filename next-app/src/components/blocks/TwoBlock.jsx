import { prerenderHtml } from '@/lib/prerenderHtml'

export default async function TwoBlock({ item }) {
  // const item = block.block_items?.[0]
  if (!item) return null

  const leftContentHtml = await prerenderHtml(item.left_box, { imgClass: 'rounded-xl my-6 max-w-full h-auto' });
  const rightContentHtml = await prerenderHtml(item.right_box, { imgClass: 'rounded-xl my-6 max-w-full h-auto' });

  return (
    <section  style={item?.background_color ? { backgroundColor: item.background_color } : {}}>
      <div className={`${item?.padding || ''} ${item?.padding_x || ''} ${item?.padding_y || ''} ${item?.align || ''} max-w-${item?.max_w || ''} ${item?.gap || ''} 
            grid grid-cols-1 md:grid-cols-2 mx-auto`}>
        <div dangerouslySetInnerHTML={{ __html: leftContentHtml }} />
        <div dangerouslySetInnerHTML={{ __html: rightContentHtml }} />
      </div>
    </section>
  )
}
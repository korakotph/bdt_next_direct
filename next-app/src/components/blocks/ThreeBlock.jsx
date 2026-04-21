import { prerenderHtml } from '@/lib/prerenderHtml'

export default async function ThreeBlock({ item }) {
  // const item = block.block_items?.[0]
  if (!item) return null

  const ContentHtml_1 = await prerenderHtml(item.box_1);
  const ContentHtml_2 = await prerenderHtml(item.box_2);
  const ContentHtml_3 = await prerenderHtml(item.box_3);

  return (
    <section  style={item?.background_color ? { backgroundColor: item.background_color } : {}}>
      <div className={`${item?.padding || ''} ${item?.padding_x || ''} ${item?.padding_y || ''} ${item?.align || ''} max-w-${item?.max_w || ''} ${item?.gap_3 || ''} 
            grid grid-cols-1 md:grid-cols-3 mx-auto`}>
        <div dangerouslySetInnerHTML={{ __html: ContentHtml_1 }} />
        <div dangerouslySetInnerHTML={{ __html: ContentHtml_2 }} />
        <div dangerouslySetInnerHTML={{ __html: ContentHtml_3 }} />
      </div>
    </section>
  )
}
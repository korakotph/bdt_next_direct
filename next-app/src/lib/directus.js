import { notFound } from "next/navigation";

// Server-side only — ใช้ internal URL เพื่อเชื่อมต่อภายใน Docker network
const BASE_URL = process.env.DIRECTUS_INTERNAL_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL
// const BASE_URL = isServer
//   ? process.env.DIRECTUS_INTERNAL_URL
//   : process.env.NEXT_PUBLIC_DIRECTUS_URL

/**
 * ดึง page ตาม slug + language
 */
export async function getPageBySlug(slug) {
  const params = new URLSearchParams()

  /* =========================
   * Page filter
   * ========================= */
  params.append('filter[slug][_eq]', slug)
  params.append('filter[status][_eq]', 'published')

  /* =========================
   * Page fields
   * ========================= */
  params.append('fields[]', 'id')
  params.append('fields[]', 'slug')
  params.append('fields[]', 'title')
  params.append('fields[]', 'show_in_menu')
  params.append('fields[]', 'blocks')

  params.append('fields[]', 'blocks.*')
  params.append('fields[]', 'blocks.type.id')
  params.append('fields[]', 'blocks.type.code')
  params.append('fields[]', 'blocks.type.type')

  const url = `${BASE_URL}/items/pages?${params.toString()}`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) return null

  const json = await res.json()
  const page = json.data?.[0]
  if (!page) return null

  // ✅ FIX: ใช้ page.page_blocks
  const blocks = page.blocks || []

  // ✅ safety sort (กัน API พลาด)
  blocks.forEach(block => {
    block.blocks?.sort((a, b) => a.sort - b.sort)
  })

  const results = {
    id: page.id,
    slug: page.slug,
    menu_order: page.menu_order,
    show_in_menu: page.show_in_menu,
    blocks
  }

  return results
}
/**
 * ดึง page สำหรับ menu / sitemap (ตามภาษา)
 */
export async function getPages() {
  // console.log('Fetching pages for menu...');
  const params = new URLSearchParams();

  // ===== MAIN FILTER =====
  params.append('filter[status][_eq]', 'published');
  params.append('filter[show_in_menu][_eq]', 'true');

  params.append('fields[]', 'id');
  params.append('fields[]', 'slug');
  params.append('fields[]', 'title');
  params.append('fields[]', 'first_page');
  params.append('fields[]', 'show_in_menu');
  params.append('fields[]', 'children.slug');
  params.append('fields[]', 'children.title');

  // ===== DEEP FILTER =====
  params.append('deep[children][sort]', 'sort');

  // params.append('deep[children][sort]', 'sort');

  const url = `${BASE_URL}/items/pages?${params.toString()}`;
  // console.log('Fetching url:', url);

  const res = await fetch(url, {
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error('Failed to fetch pages');
  }

  const json = await res.json();

  // console.log('Fetched pages:', json);

  // ===== NORMALIZE =====
  const results = (json.data || []).map(page => {
    const children = (page.children || []).map(child => {

      return {
        id: child.id,
        slug: child.slug,
        title: child.title ?? child.slug,
        show_in_menu: child.show_in_menu ?? true,
        // blocks: child.blocks || []
      };
    });

    return {
      id: page.id,
      slug: page.slug,
      title: page.title ?? page.slug,
      show_in_menu: page.show_in_menu,
      // blocks: page.blocks || [],
      children
    };
  });
  // console.log('Normalized pages:', results);
  return results;
}
/**
 * ดึง slug ของหน้าที่ตั้งเป็น first_page
 */
export async function getFirstPageSlug() {
  const params = new URLSearchParams()
  params.append('filter[first_page][_eq]', 'true')
  params.append('filter[status][_eq]', 'published')
  params.append('fields[]', 'slug')
  params.append('limit', '1')

  const res = await fetch(`${BASE_URL}/items/pages?${params.toString()}`, { cache: 'no-store' })
  if (!res.ok) return '/'

  const json = await res.json()
  const slug = json.data?.[0]?.slug
  return slug ? `/${slug}` : '/'
}

/**
 * ดึง page ตาม slug + language
 */
async function getNewsParentId(newsid) {
  const params = new URLSearchParams()
  // params.append('filter[slug][_eq]', 'news')
  const id = Number(newsid)
  // console.log('Parsing newsid:', newsid, 'to id:', id);

  if (!Number.isInteger(id)) {
    return notFound() // Next.js
  }

  params.append('filter[id][_eq]', id)
  // console.log('Fetching news parent with params:', params.toString());

  const res = await fetch(
    `${BASE_URL}/items/news?${params.toString()}`,
    { cache: 'no-store' }
  )
  // console.log('Fetching news parent with newsid:', newsid, 'from URL:', `${BASE_URL}/items/news?${params.toString()}`);

  if (!res.ok) return null

  const json = await res.json()
  // console.log('News parent fetch result:', json);

  return json.data?.[0];
}

export async function getNewsDetailBySlug(slug) {
  const parent = await getNewsParentId(slug)
  if (!parent?.id) return null

  const params = new URLSearchParams()

  // 🔥 ลูกของ news เท่านั้น
  params.append('filter[news_id][_eq]', parent.id)

  const url = `${BASE_URL}/items/news_detail?${params.toString()}`

  // console.log('Fetching news detail from URL:', url);
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) return null

  const json = await res.json()
  const page = json.data?.[0]
  if (!page) return null


  const results = {
    id: page.id,
    slug: slug,
    content: page.content,
    parent: parent || null
  }

  return results;
}
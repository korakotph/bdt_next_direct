import { readItem, readItems } from '@directus/sdk'
import { getDirectusClient } from './directus-client'

export async function getPageBySlug(slug) {
  const client = getDirectusClient()

  const pages = await client.request(
    readItems('pages', {
      filter: {
        slug: { _eq: slug },
        status: { _eq: 'published' },
      },
      fields: [
        'id',
        'slug',
        'title',
        'show_in_menu',
        'blocks',
        'blocks.*',
        'blocks.type.id',
        'blocks.type.code',
        'blocks.type.type',
      ],
    })
  )

  const page = pages?.[0]
  if (!page) return null

  const blocks = page.blocks || []
  blocks.forEach(block => {
    block.blocks?.sort((a, b) => a.sort - b.sort)
  })

  return {
    id: page.id,
    slug: page.slug,
    menu_order: page.menu_order,
    show_in_menu: page.show_in_menu,
    blocks,
  }
}

export async function getPages() {
  const client = getDirectusClient()

  const pages = await client.request(
    readItems('pages', {
      filter: {
        status: { _eq: 'published' },
        show_in_menu: { _eq: true },
      },
      fields: [
        'id',
        'slug',
        'title',
        'first_page',
        'show_in_menu',
        'children.slug',
        'children.title',
      ],
      deep: {
        children: { _sort: ['sort'] },
      },
    })
  )

  return (pages || []).map(page => ({
    id: page.id,
    slug: page.slug,
    title: page.title ?? page.slug,
    show_in_menu: page.show_in_menu,
    children: (page.children || []).map(child => ({
      id: child.id,
      slug: child.slug,
      title: child.title ?? child.slug,
      show_in_menu: child.show_in_menu ?? true,
    })),
  }))
}

export async function getFirstPageSlug() {
  const client = getDirectusClient()

  const pages = await client.request(
    readItems('pages', {
      filter: {
        first_page: { _eq: true },
        status: { _eq: 'published' },
      },
      fields: ['slug'],
      limit: 1,
    })
  )

  const slug = pages?.[0]?.slug
  return slug ? `/${slug}` : '/'
}

export async function getNewsDetailBySlug(slug) {
  const id = Number(slug)
  if (!Number.isInteger(id)) return null

  const client = getDirectusClient()
  try {
    const newsItem = await client.request(readItem('news', id))
    if (!newsItem) return null
    return {
      id: newsItem.id,
      slug,
      content: newsItem.content ?? null,
      parent: newsItem,
    }
  } catch {
    return null
  }
}

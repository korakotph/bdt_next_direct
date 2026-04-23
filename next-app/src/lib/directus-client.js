import { createDirectus, rest } from '@directus/sdk'

const isServer = typeof window === 'undefined'

function getBaseUrl() {
  return (isServer ? process.env.DIRECTUS_INTERNAL_URL : null)
    || process.env.NEXT_PUBLIC_DIRECTUS_URL
}

// Singleton — reused across server-side requests within the same process
let _client = null

export function getDirectusClient() {
  const url = getBaseUrl()
  if (!_client) {
    _client = createDirectus(url).with(
      rest({ onRequest: opts => ({ ...opts, cache: 'no-store' }) })
    )
  }
  return _client
}

'use strict'

import { cache } from 'react'
import { readSingleton } from '@directus/sdk'
import { getDirectusClient } from './directus-client'

export const getSiteSettings = cache(async function getSiteSettings() {
  try {
    const client = getDirectusClient()
    return await client.request(readSingleton('Site_Settings'))
  } catch {
    return null
  }
})

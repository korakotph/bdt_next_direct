'use strict';

const isServer = typeof window === "undefined"

const BASE_URL = isServer
  ? process.env.DIRECTUS_INTERNAL_URL
  : process.env.NEXT_PUBLIC_DIRECTUS_URL

export async function getSiteSettings() {
  try {
    const res = await fetch(
      `${BASE_URL}/items/Site_Settings`,
      { cache: "no-store", next: { tags: ["site-settings"] } }
    );

    if (!res.ok) return null;

    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

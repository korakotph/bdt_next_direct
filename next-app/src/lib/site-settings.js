'use strict';

const isServer = typeof window === "undefined"

// console.log("isServer:", isServer);

const BASE_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL
// const BASE_URL = isServer
//   ? process.env.DIRECTUS_INTERNAL_URL
//   : process.env.NEXT_PUBLIC_DIRECTUS_URL

  // console.log("BASE_URL:", BASE_URL);

export async function getSiteSettings() {
  const res = await fetch(
    `${BASE_URL}/items/Site_Settings`,
    { cache: "no-store", next: { tags: ["site-settings"] } }
  );


  const json = await res.json();
  // console.log('Fetched site settings:', json);
  return json.data;
}

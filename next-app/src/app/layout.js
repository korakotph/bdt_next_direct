import "@/styles/globals.css";
import { getSiteSettings } from "@/lib/site-settings";
import PopupNews from "@/components/NewsPopup";

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const setting = await getSiteSettings();
  const icons = setting?.logo
    ? { icon: `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${setting.logo}` }
    : undefined;
  return {
    charset: 'utf-8',
    ...(icons && { icons }),
  };
}

export default async function RootLayout({ children }) {
  const setting = await getSiteSettings();

  return (
    <html lang="th">
      <head>
        <link rel="stylesheet" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/fonts.css`} />
      </head>
      <body>
        {children}
        <PopupNews enabled={!!setting?.landing} />
      </body>
    </html>
  );
}

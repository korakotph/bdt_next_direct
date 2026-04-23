import "@/styles/globals.css";
import { getSiteSettings } from "@/lib/site-settings";
import PopupNews from "@/components/NewsPopup";

export const metadata = {
  charset: 'utf-8',
}

export default async function RootLayout({ children }) {
  const setting = await getSiteSettings();

  return (
    <html lang="th">
      <head>
        <link rel="stylesheet" href="/fonts.css" />
      </head>
      <body>
        {children}
        <PopupNews enabled={!!setting?.landing} />
      </body>
    </html>
  );
}

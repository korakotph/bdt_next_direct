// app/layout.js
import "@/styles/globals.css";

export const metadata = {
  charset: 'utf-8',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="stylesheet" href="/fonts.css" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

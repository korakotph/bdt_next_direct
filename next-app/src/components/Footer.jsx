import { prerenderHtml } from '@/lib/prerenderHtml'

export default async function Footer({ settings, lang }) {
  const ContentHtml = await prerenderHtml(settings?.footer_content);

  if (settings?.footer_theme == 2) {
    const footerTextColor = settings?.footer_text_color ?? '#ffffff'
    return (
      <footer
        className="text-white shadow-md"
        style={{ backgroundColor: settings?.footer_color }}
      >
        <style>{`.footer-content a { color: ${footerTextColor} !important; } .footer-content a:hover { color: ${footerTextColor} !important; } .footer-content p { margin: 0 !important; }`}</style>
        <div className={`max-w-${settings?.max_w_footer} mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-6 py-4`}>
          <div className="text-sm text-left md:text-left" style={{ color: footerTextColor }}>
            {settings?.footer_name}
          </div>
          <div className="footer-content text-sm text-right md:text-right" style={{ color: footerTextColor }} dangerouslySetInnerHTML={{ __html: ContentHtml }}/>
        </div>
      </footer>
    )
  }

  return (
    <footer
      className="text-white shadow-md"
      style={{ backgroundColor: settings?.footer_color }}
    >
      <div className={`max-w-${settings?.max_w_footer} mx-auto flex flex-col md:flex-row justify-center items-center gap-4 px-6 py-4`}>
        <div className="text-sm text-center md:text-left" style={{ color: settings?.footer_text_color }}>
          {settings?.footer_name}
        </div>
      </div>
    </footer>
  )
}

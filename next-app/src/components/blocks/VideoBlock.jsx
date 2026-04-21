export default function VideoBlock({ item }) {

  if (!item) return null

  const align = item?.align ?? 'center'
  const rounded = item?.rounded ?? true
  const videoType = item?.video_type

  /* ---------- directus video url ---------- */
  const videoUrl =
    videoType === 'video_file' && item?.video?.id
      ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${item.video.id}`
      : null

  /* ---------- youtube embed ---------- */
  const youtubeEmbed =
    videoType === 'youtube_link' && item?.youtube_link
      ? `https://www.youtube.com/embed/${extractYoutubeId(item.youtube_link)}`
      : null

  return (
    <section
      className={`${item.max_w || ''} ${item.bg_color || ''} ${item.text_color || ''} 
      ${item.padding || ''} ${item.padding_y || ''} ${item.padding_x || ''} 
      mx-auto px-6 pt-8`}
    >
      <div className="grid grid-cols-1 gap-4" style={{ textAlign: align }}>

        {/* ---------- VIDEO FILE ---------- */}
        {videoType === 'video_file' && videoUrl && (
          <video
            src={videoUrl}
            className={`w-full mb-2 ${rounded ? 'rounded-lg' : ''}`}
            controls
            loop={item.loop ?? false}
            autoPlay={item.video_autoplay ?? false}
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        )}

        {/* ---------- YOUTUBE ---------- */}
        {videoType === 'youtube_link' && youtubeEmbed && (
          <div className={`w-full aspect-video ${rounded ? 'rounded-lg overflow-hidden' : ''}`}>
            <iframe
              src={youtubeEmbed}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

      </div>
    </section>
  )
}


/* ---------- helper function ---------- */
function extractYoutubeId(url) {
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}
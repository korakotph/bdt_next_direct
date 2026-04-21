import HeaderBlock from './HeaderBlock'
import NewsBlock from './NewsBlock'
import CardBlock from './CardBlock'
import HeroBlock from './HeroBlock'
import ImagesBlock from './ImagesBlock'
import VideoBlock from './VideoBlock'
import BlankBlock from './BlankBlock'
import DivBlock from './DivBlock'
import TwoBlock from './TwoBlock'
import ThreeBlock from './ThreeBlock'
import TableBlock from './TableBlock'
import SlideBlock from './SlideBlock'
import PdfBlock from './PdfBlock'
import ExcelBlock from './ExcelBlock'
import LinkBlock from './LinkBlock'

export default function BlockRenderer({ blocks }) {
  if (!blocks?.length) return null
  console.log('Rendering blocks:', blocks)

  return (
    <>
      {blocks.map(item => {
        switch (item.type?.code) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'p':
            case 'container':
              return (
                <HeaderBlock
                  key={`header-${item.id}`}
                  item={item}
                  // lang={lang}
                />
              )
            case 'a':
              return (
                <LinkBlock
                  key={`link-${item.id}`}
                  item={item}
                />
              )
            case 'div':
              return (
                <DivBlock
                  key={`div-${item.id}`}
                  item={item}
                />
              )
            case '2div':
              return (
                <TwoBlock
                  key={`two-${item.id}`}
                  item={item}
                />
              )
            case '3div':
              return (
                <ThreeBlock
                  key={`three-${item.id}`}
                  item={item}
                />
              )
            case 'blank':
              return (
                <BlankBlock
                  key={`blank-${item.id}`}
                  item={item}
                />
              )
            case 'hero':
              return (
                <HeroBlock
                  key={`hero-${item.id}`}
                  item={item}
                />
              )
            case 'news':
              return (
                <NewsBlock
                  key={`news-${item.id}`}
                  item={item}
                />
              )
            case 'card':
              return (
                <CardBlock
                  key={`card-${item.id}`}
                  item={item}
                />
              )
            case 'img':
              return (
                <ImagesBlock
                  key={`img-${item.id}`}
                  item={item}
                />
              )
            case 'video':
              return (
                <VideoBlock
                  key={`video-${item.id}`}
                  item={item}
                />
              )
            case 'table':
              return (
                <TableBlock
                  key={`table-${item.id}`}
                  item={item}
                />
              )
            case 'slide':
              return (
                <SlideBlock
                  key={`slide-${item.id}`}
                  item={item}
                />
              )
            case 'pdf':
              return (
                <PdfBlock
                  key={`pdf-${item.id}`}
                  item={item}
                />
              )
            case 'excel':
              return (
                <ExcelBlock
                  key={`excel-${item.id}`}
                  item={item}
                />
              )

            default:
              return null
           }
      })}
    </>
  )
}

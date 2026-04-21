import { use } from 'react'

export default function SubLayout({ children, params }) {
  const { slug, slug2 } = use(params)

  return (
    <div>
      {children}
    </div>
  )
}

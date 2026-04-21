import { use } from 'react'
// import "@/globals.css";

export default function Layout({ children, params }) {
  const { slug } = use(params)

  return (
    <div>
      {children}
    </div>
  )
}

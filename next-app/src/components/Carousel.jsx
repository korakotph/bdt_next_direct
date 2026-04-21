// components/Carousel.tsx
'use client'
import { useState } from 'react'

const slides = [
  '/slide1.jpg',
  '/slide2.jpg',
  '/slide3.jpg',
  '/slide4.jpg',
]

export default function Carousel() {
  const [index, setIndex] = useState(0)

  return (
    <div className="relative w-full h-[300px] overflow-hidden">
      <img src={slides[index]} className="w-full h-full object-cover transition-all duration-500" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`w-3 h-3 rounded-full ${i === index ? 'bg-white' : 'bg-gray-400'}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'

export function ProductGallery({ images = [], alt = 'Product image' }) {
  const [activeImage, setActiveImage] = useState(images[0])
  const [zoomed, setZoomed] = useState(false)

  if (!images.length) {
    return null
  }

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
        onMouseLeave={() => setZoomed(false)}
      >
        <img
          alt={alt}
          className={`h-[420px] w-full object-cover transition duration-500 ${zoomed ? 'scale-125' : 'scale-100'}`}
          onMouseEnter={() => setZoomed(true)}
          src={activeImage}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {images.map((image) => (
          <button
            className={`overflow-hidden rounded-xl border ${
              activeImage === image
                ? 'border-brand-600'
                : 'border-slate-300 dark:border-slate-700'
            }`}
            key={image}
            onClick={() => setActiveImage(image)}
            type="button"
          >
            <img alt={alt} className="h-20 w-full object-cover" src={image} />
          </button>
        ))}
      </div>
    </div>
  )
}

import { useEffect } from 'react'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

export interface PageMetaProps {
  title: string
  description: string
  /** Path for canonical URL, e.g. `/home` */
  canonicalPath?: string
  imagePath?: string
  robots?: string
}

export function PageMeta({
  title,
  description,
  canonicalPath = '/home',
  imagePath = '/brand/logo-square.png',
  robots = 'index, follow',
}: PageMetaProps) {
  useEffect(() => {
    document.title = title
    const origin = (import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, '') || window.location.origin).trim()
    const canonical = `${origin}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
    const image = imagePath.startsWith('http') ? imagePath : `${origin}${imagePath}`

    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', robots)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:image', image)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)
    upsertLink('canonical', canonical)
  }, [title, description, canonicalPath, imagePath, robots])

  return null
}

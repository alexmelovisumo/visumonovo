import { useEffect, useRef } from 'react'

const DEFAULT_TITLE = 'Visumo — Marketplace de Comunicação Visual'
const DEFAULT_DESC  = 'Conecte sua empresa com profissionais e fornecedores de comunicação visual.'

function setMeta(property: string, content: string, attr = 'property') {
  if (!content) return
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function useSEO({
  title,
  description,
  image,
}: {
  title: string
  description?: string
  image?: string
}) {
  const prevTitle = useRef(document.title)

  useEffect(() => {
    if (!title) return

    const fullTitle = `${title} | Visumo`
    const desc      = description ?? DEFAULT_DESC
    const ogImage   = image ?? `${window.location.origin}/icons/icon-512x512.png`
    const ogUrl     = window.location.href

    document.title = fullTitle
    setMeta('description',       desc,      'name')
    setMeta('og:title',          fullTitle)
    setMeta('og:description',    desc)
    setMeta('og:image',          ogImage)
    setMeta('og:url',            ogUrl)
    setMeta('og:type',           'website')
    setMeta('twitter:card',      'summary_large_image', 'name')
    setMeta('twitter:title',     fullTitle,             'name')
    setMeta('twitter:description', desc,                'name')
    setMeta('twitter:image',     ogImage,               'name')

    return () => {
      document.title = prevTitle.current
    }
  }, [title, description, image])
}

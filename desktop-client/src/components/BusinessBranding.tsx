import { useEffect } from 'react'
import { getPublicBusinessSettings, resolveImageUrl } from '../services/api'

function setFavicon(url: string) {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]'))
  let link = links.find((l) => l.getAttribute('type') === 'image/png') || links[0]
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url
  link.setAttribute('type', 'image/png')
}

function BusinessBranding() {
  useEffect(() => {
    const apply = (biz: { business_name?: string; logo?: string | null }) => {
      if (biz?.business_name) {
        document.title = biz.business_name
      }
      if (biz?.logo) {
        setFavicon(resolveImageUrl(biz.logo) ?? '')
      }
    }
    const loadBiz = () => getPublicBusinessSettings().then(apply).catch(() => {})
    loadBiz()
    window.addEventListener('business-settings-updated', loadBiz)
    return () => window.removeEventListener('business-settings-updated', loadBiz)
  }, [])

  return null
}

export default BusinessBranding

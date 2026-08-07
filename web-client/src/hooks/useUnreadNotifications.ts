import { useCallback, useEffect, useState } from 'react'
import { getMyNotifications } from '../services/api'

const REFRESH_MS = 60_000
const LIMIT = 50
const CHANGED_EVENT = 'notifications-changed'

export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await getMyNotifications({ isRead: 'false', limit: LIMIT })
      const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      setUnreadCount(arr.length)
    } catch {
      setUnreadCount(0)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => { void refresh() }, REFRESH_MS)
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh() }
    const onFocus = () => { void refresh() }
    const onChange = () => { void refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener(CHANGED_EVENT, onChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(CHANGED_EVENT, onChange)
    }
  }, [refresh])

  return { unreadCount, refresh }
}

export const notifyNotificationsChanged = () => {
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

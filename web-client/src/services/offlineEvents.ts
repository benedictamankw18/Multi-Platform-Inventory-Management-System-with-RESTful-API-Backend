export type OfflineEventMap = {
  online: void
  offline: void
  'queue-changed': void
  'sync-state': { syncing: boolean }
  'sync-done': { processed: number; failed: number }
}

type Handler<K extends keyof OfflineEventMap> = (payload: OfflineEventMap[K]) => void

const listeners: { [K in keyof OfflineEventMap]: Set<Handler<K>> } = {
  online: new Set(),
  offline: new Set(),
  'queue-changed': new Set(),
  'sync-state': new Set(),
  'sync-done': new Set(),
}

export function on<K extends keyof OfflineEventMap>(event: K, handler: Handler<K>): () => void {
  listeners[event].add(handler)
  return () => {
    listeners[event].delete(handler)
  }
}

export function emit<K extends keyof OfflineEventMap>(event: K, payload?: OfflineEventMap[K]): void {
  listeners[event].forEach((h) => h(payload as OfflineEventMap[K]))
}

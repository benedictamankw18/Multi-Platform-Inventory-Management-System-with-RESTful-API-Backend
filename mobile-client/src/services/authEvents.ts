/**
 * authEvents.ts
 *
 * Tiny app-wide event bus for auth-lifecycle signals that must cross context
 * boundaries. `serverConfig` (which sits ABOVE AuthProvider) uses it to tell
 * AuthProvider to drop its in-memory session when the server changes — the same
 * role `window`'s `auth:expired` event plays on the desktop client.
 */

type Handler = () => void

const sessionResetHandlers = new Set<Handler>()

/** Subscribe to "reset in-memory session" notifications. Returns an unsubscribe. */
export function onSessionReset(handler: Handler): () => void {
  sessionResetHandlers.add(handler)
  return () => {
    sessionResetHandlers.delete(handler)
  }
}

export function emitSessionReset(): void {
  sessionResetHandlers.forEach((handler) => handler())
}

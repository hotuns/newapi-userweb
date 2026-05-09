export type StoredEmbeddedChatSession = {
  name: string
  tokenId: number
}

const EMBEDDED_CHAT_SESSION_STORAGE_KEY = 'newapi-userweb:embedded-chat-session'

export function readStoredEmbeddedChatSession(): StoredEmbeddedChatSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(EMBEDDED_CHAT_SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<StoredEmbeddedChatSession>
    const tokenId = parsed.tokenId

    if (
      typeof parsed.name !== 'string' ||
      typeof tokenId !== 'number' ||
      !Number.isInteger(tokenId)
    ) {
      return null
    }

    return {
      name: parsed.name,
      tokenId,
    }
  } catch {
    return null
  }
}

export function saveStoredEmbeddedChatSession(session: StoredEmbeddedChatSession) {
  try {
    window.sessionStorage.setItem(EMBEDDED_CHAT_SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Refresh persistence is best-effort; chat can still open normally.
  }
}

export function clearStoredEmbeddedChatSession() {
  try {
    window.sessionStorage.removeItem(EMBEDDED_CHAT_SESSION_STORAGE_KEY)
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
}

import type { AvaConversation } from './api.types.js'

export function conversationListLabel(
  conversation: AvaConversation,
  fallback: string,
): string {
  const title = conversation.title?.trim()
  if (title) return title
  return fallback
}

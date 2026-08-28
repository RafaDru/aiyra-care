/** Chunk final reply for SSE when provider does not stream token-by-token. */
export function chunkReplyForSse(text: string, chunkSize = 56): string[] {
  if (!text) return []
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

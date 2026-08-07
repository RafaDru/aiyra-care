/** Repara mojibake UTF-8 ↔ Latin-1 no cliente (dados antigos no DB). */
export function repairUtf8Mojibake(text: string): string {
  if (!text) return text
  const suspicious = /Ã.|Â.|â€|ï¿½|\uFFFD/.test(text)
  if (!suspicious) return text

  try {
    const bytes = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff
    const fixed = new TextDecoder('utf-8').decode(bytes)
    const badBefore = (text.match(/Ã./g) || []).length
    const badAfter = (fixed.match(/Ã./g) || []).length
    if (badAfter < badBefore) return fixed
    if (/[ãõçéíóúàêô]/i.test(fixed)) return fixed
  } catch {
    // ignore
  }
  return text
}

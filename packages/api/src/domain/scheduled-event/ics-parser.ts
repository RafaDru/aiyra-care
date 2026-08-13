export interface ParsedIcsEvent {
  uid: string
  title: string
  description: string | null
  scheduledAt: Date
  endAt: Date | null
}

function unfoldIcsLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const lines: string[] = []
  for (const line of raw) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (lines.length === 0) continue
      lines[lines.length - 1] += line.slice(1)
    } else if (line.trim()) {
      lines.push(line.trim())
    }
  }
  return lines
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function parseIcsProperty(line: string): { name: string; value: string } {
  const colon = line.indexOf(':')
  if (colon < 0) return { name: line.toUpperCase(), value: '' }
  const head = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const name = head.split(';')[0].toUpperCase()
  return { name, value: unescapeIcsText(value) }
}

function parseIcsDate(value: string): Date | null {
  const v = value.trim()
  if (!v) return null
  if (v.length === 8 && /^\d{8}$/.test(v)) {
    const y = v.slice(0, 4)
    const m = v.slice(4, 6)
    const d = v.slice(6, 8)
    return new Date(`${y}-${m}-${d}T12:00:00`)
  }
  const clean = v.replace(/Z$/i, '')
  if (clean.length < 15) return null
  const y = clean.slice(0, 4)
  const mo = clean.slice(4, 6)
  const day = clean.slice(6, 8)
  const h = clean.slice(9, 11) || '00'
  const min = clean.slice(11, 13) || '00'
  const sec = clean.slice(13, 15) || '00'
  if (/Z$/i.test(v)) {
    return new Date(`${y}-${mo}-${day}T${h}:${min}:${sec}Z`)
  }
  return new Date(`${y}-${mo}-${day}T${h}:${min}:${sec}`)
}

function inferKind(title: string): 'appointment' | 'reminder' | 'task' {
  const t = title.toLowerCase()
  if (t.includes('consulta') || t.includes('appointment') || t.includes('médico') || t.includes('medico')) {
    return 'appointment'
  }
  if (t.includes('tarefa') || t.includes('task')) return 'task'
  return 'reminder'
}

function syntheticUid(title: string, start: Date): string {
  return `synthetic-${start.toISOString()}-${title.trim().toLowerCase().slice(0, 80)}`
}

/** Parse VEVENT blocks from iCalendar (ICS) text. */
export function parseIcsCalendar(content: string): ParsedIcsEvent[] {
  const lines = unfoldIcsLines(content)
  const events: ParsedIcsEvent[] = []
  let inEvent = false
  let uid: string | null = null
  let title: string | null = null
  let description: string | null = null
  let start: Date | null = null
  let end: Date | null = null

  const flush = () => {
    if (!start || !title) return
    const finalUid = uid?.trim() || syntheticUid(title, start)
    events.push({
      uid: finalUid,
      title: title.trim(),
      description: description?.trim() || null,
      scheduledAt: start,
      endAt: end,
    })
  }

  for (const line of lines) {
    const upper = line.toUpperCase()
    if (upper === 'BEGIN:VEVENT') {
      inEvent = true
      uid = null
      title = null
      description = null
      start = null
      end = null
      continue
    }
    if (upper === 'END:VEVENT') {
      if (inEvent) flush()
      inEvent = false
      continue
    }
    if (!inEvent) continue

    const { name, value } = parseIcsProperty(line)
    if (name === 'UID') uid = value
    if (name === 'SUMMARY') title = value
    if (name === 'DESCRIPTION') description = value
    if (name === 'DTSTART') start = parseIcsDate(value)
    if (name === 'DTEND') end = parseIcsDate(value)
  }

  return events
}

export function inferScheduledEventKind(title: string): 'appointment' | 'reminder' | 'task' {
  return inferKind(title)
}

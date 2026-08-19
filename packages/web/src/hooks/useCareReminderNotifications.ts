import { useEffect, useRef } from 'react'
import { api } from '../lib/api.js'
import type { CareReminderRow } from '../lib/api.types.js'

export async function requestCareReminderNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export function useCareReminderNotifications(patientId: string, enabled = true) {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || !patientId) return
    if (typeof Notification === 'undefined') return

    const notify = (reminders: CareReminderRow[]) => {
      if (Notification.permission !== 'granted') return
      for (const r of reminders) {
        if (notifiedRef.current.has(r.id)) continue
        const body = r.doseHint ? `${r.doseHint}` : undefined
        try {
          new Notification(r.title, { body, tag: `care-reminder-${r.id}` })
          notifiedRef.current.add(r.id)
        } catch {
          // ignore — e.g. insecure context
        }
      }
    }

    const poll = () => {
      api.careReminders.pending(patientId)
        .then(notify)
        .catch(() => {})
    }

    poll()
    const id = window.setInterval(poll, 60000)
    return () => window.clearInterval(id)
  }, [patientId, enabled])
}

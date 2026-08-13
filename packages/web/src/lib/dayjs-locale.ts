import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import 'dayjs/locale/en'

export function syncDayjsLocale(language: string): void {
  dayjs.locale(language.startsWith('en') ? 'en' : 'pt-br')
}

export function formatCalendarMonth(value: dayjs.Dayjs, language: string): string {
  const locale = language.startsWith('en') ? 'en-US' : 'pt-BR'
  return value.toDate().toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export function formatCalendarDayLong(value: dayjs.Dayjs, language: string): string {
  const locale = language.startsWith('en') ? 'en-US' : 'pt-BR'
  return value.toDate().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

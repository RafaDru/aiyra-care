import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const PHRASE_KEYS = [
  'ava.thinkingPhrases.pensando',
  'ava.thinkingPhrases.analisando',
  'ava.thinkingPhrases.exames',
  'ava.thinkingPhrases.organizando',
  'ava.thinkingPhrases.conferindo',
] as const

/** Frases rotativas (pool fixo) enquanto a LLM processa — não é texto ao vivo do modelo. */
export function useAvaThinkingPhrase(active: boolean): string {
  const { t } = useTranslation()
  const phrases = useMemo(() => PHRASE_KEYS.map((key) => t(key)), [t])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      return
    }
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [active, phrases.length])

  return phrases[index] ?? phrases[0] ?? t('ava.thinking')
}

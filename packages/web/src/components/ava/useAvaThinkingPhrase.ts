import { useEffect, useState } from 'react'

const THINKING_PHRASES = [
  'Pensando…',
  'Analisando o prontuário…',
  'Pesquisando nos exames…',
  'Organizando as informações…',
  'Conferindo os dados…',
]

/** Frase de "pensando" que rotaciona a cada 2s enquanto a LLM processa. */
export function useAvaThinkingPhrase(active: boolean): string {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      return
    }
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % THINKING_PHRASES.length),
      2000,
    )
    return () => window.clearInterval(timer)
  }, [active])

  return THINKING_PHRASES[index]
}

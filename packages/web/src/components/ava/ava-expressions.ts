/**
 * Catálogo de expressões visuais da Ava — PNGs dedicados por pose.
 * Chat: crossfade 1s entre poses. Dock intro: greeting → present.
 */
export type AvaExpression =
  | 'present'
  | 'greeting'
  | 'listening'
  | 'reflective'
  | 'researching'
  | 'warm'

export interface AvaExpressionConfig {
  id: AvaExpression
  src: string
  shellClass?: string
  labelKey: string
}

export const AVA_EXPRESSIONS: Record<AvaExpression, AvaExpressionConfig> = {
  present: {
    id: 'present',
    src: '/brand/ava-avatar.png',
    labelKey: 'ava.expressions.present',
  },
  greeting: {
    id: 'greeting',
    src: '/brand/ava-expressions/greeting.png',
    shellClass: 'ava-avatar-shell--warm',
    labelKey: 'ava.expressions.greeting',
  },
  listening: {
    id: 'listening',
    src: '/brand/ava-expressions/listening.png',
    labelKey: 'ava.expressions.listening',
  },
  warm: {
    id: 'warm',
    src: '/brand/ava-expressions/warm.png',
    shellClass: 'ava-avatar-shell--warm',
    labelKey: 'ava.expressions.warm',
  },
  reflective: {
    id: 'reflective',
    src: '/brand/ava-expressions/reflective.png',
    labelKey: 'ava.expressions.reflective',
  },
  researching: {
    id: 'researching',
    src: '/brand/ava-expressions/researching.png',
    labelKey: 'ava.expressions.researching',
  },
}

export function resolveAvaExpressionConfig(expression: AvaExpression): AvaExpressionConfig {
  return AVA_EXPRESSIONS[expression] ?? AVA_EXPRESSIONS.present
}

/** Mapeia frase de status (loop UI) → expressão visual. */
export function expressionForThinkingPhrase(phrase: string): AvaExpression {
  const q = phrase.toLowerCase()
  if (
    q.includes('exame') ||
    q.includes('exam') ||
    q.includes('pesquis') ||
    q.includes('search')
  ) {
    return 'researching'
  }
  if (q.includes('organiz') || q.includes('analis') || q.includes('confer') || q.includes('pens')) {
    return 'reflective'
  }
  return 'reflective'
}

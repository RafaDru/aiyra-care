import type { AvaDockIntroPhase } from './useAvaDockIntro.js'
import {
  type AvaExpression,
  expressionForThinkingPhrase,
} from './ava-expressions.js'

export type AvaExpressionContext = 'dock' | 'chat'

export interface UseAvaExpressionOptions {
  context?: AvaExpressionContext
  introPhase?: AvaDockIntroPhase
}

/**
 * Dock: greeting → present (neutro). Chat: listening + poses de pensamento.
 */
export function useAvaExpression(
  loading: boolean,
  thinkingPhrase: string,
  options?: UseAvaExpressionOptions,
): AvaExpression {
  const context = options?.context ?? 'chat'

  if (context === 'dock') {
    if (options?.introPhase === 'greeting') return 'greeting'
    return 'present'
  }

  if (loading) return expressionForThinkingPhrase(thinkingPhrase)
  return 'listening'
}

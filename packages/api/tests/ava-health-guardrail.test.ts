import { describe, expect, it } from 'vitest'
import { classifyAvaUserMessage } from '../src/domain/llm/ava-health-guardrail.js'

describe('ava-health-guardrail', () => {
  it('permite perguntas clínicas', () => {
    expect(classifyAvaUserMessage('A febre do Lucas está alta, o que faço?')).toBe('health')
  })

  it('bloqueia pedidos de código', () => {
    expect(classifyAvaUserMessage('Escreva um código React para minha API REST')).toBe('off_topic')
  })

  it('prioriza contexto de saúde em mensagens mistas', () => {
    expect(classifyAvaUserMessage('No exame de sangue, o que significa hemoglobina?')).toBe('health')
  })
})

import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export interface LlmMessage { role: 'system' | 'user' | 'assistant'; content: string }

export class GroqLlmAdapter {
  private model = 'llama-3.3-70b-versatile'

  async ask(messages: LlmMessage[]): Promise<string> {
    const completion = await groq.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: 0.1,
    })
    return completion.choices[0]?.message?.content || ''
  }

  async extractJson<T>(systemPrompt: string, userContent: string): Promise<T> {
    const text = await this.ask([
      { role: 'system', content: `${systemPrompt}\nResponda APENAS com JSON válido, sem markdown.` },
      { role: 'user', content: userContent },
    ])
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned) as T
  }
}

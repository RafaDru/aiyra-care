import { useEffect, useId, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'

let mermaidInitialized = false

function ensureMermaid() {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'strict',
    fontFamily: 'Inter, system-ui, sans-serif',
  })
  mermaidInitialized = true
}

function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reactId = useId().replace(/:/g, '')

  useEffect(() => {
    ensureMermaid()
    const el = containerRef.current
    if (!el) return
    const id = `mermaid-${reactId}`
    mermaid
      .render(id, chart.trim())
      .then(({ svg }) => {
        el.innerHTML = svg
      })
      .catch(() => {
        el.textContent = chart
      })
  }, [chart, reactId])

  return <div ref={containerRef} className="ops-mermaid" />
}

export function OpsMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={className ?? 'ops-strategy-markdown'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: codeClass, children, ...props }) {
            const text = String(children).replace(/\n$/, '')
            const match = /language-(\w+)/.exec(codeClass ?? '')
            if (match?.[1] === 'mermaid') {
              return <MermaidBlock chart={text} />
            }
            const inline = !codeClass
            if (inline) {
              return (
                <code className={codeClass} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <pre className="ops-markdown-pre">
                <code className={codeClass} {...props}>{children}</code>
              </pre>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

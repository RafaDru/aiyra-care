import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseAvaChartSpec } from '../../lib/ava-chart-parser.js'
import { AvaInlineChart } from './AvaInlineChart.js'
import './ava-markdown.css'

interface Props {
  content: string
}

function isInternalAppPath(href: string | undefined): string | null {
  if (!href) return null
  if (href.startsWith('/patients/')) return href
  try {
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin && url.pathname.startsWith('/patients/')) {
      return `${url.pathname}${url.search}`
    }
  } catch {
    return null
  }
  return null
}

/**
 * Renderização rica das respostas da Ava: markdown com tabelas (GFM),
 * listas, negrito — links internos navegam no app (G2); blocos ```chart → recharts.
 */
export function AvaMarkdown({ content }: Props) {
  return (
    <div className="ava-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const internal = isInternalAppPath(href)
            if (internal) {
              return (
                <Link to={internal} className="ava-markdown__app-link">
                  {children}
                </Link>
              )
            }
            return (
              <a href={href} {...props} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
          table: ({ children, ...props }) => (
            <div className="ava-markdown__table-scroll">
              <table {...props}>{children}</table>
            </div>
          ),
          code: ({ className, children, ...props }) => {
            const isChart = className?.includes('language-chart')
            if (isChart) {
              const spec = parseAvaChartSpec(String(children).replace(/\n$/, ''))
              if (spec) return <AvaInlineChart spec={spec} />
            }
            const isBlock = Boolean(className)
            if (isBlock) {
              return (
                <pre className="ava-markdown__code-block">
                  <code className={className} {...props}>{children}</code>
                </pre>
              )
            }
            return <code className={className} {...props}>{children}</code>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

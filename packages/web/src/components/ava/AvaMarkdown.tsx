import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
 * listas, negrito — links internos navegam no app (G2).
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ava-markdown.css'

interface Props {
  content: string
}

/**
 * Renderização rica das respostas da Ava: markdown com tabelas (GFM),
 * listas, negrito e código — estilizado para os balões do chat.
 */
export function AvaMarkdown({ content }: Props) {
  return (
    <div className="ava-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

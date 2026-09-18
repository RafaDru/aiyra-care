import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function StrategyMarkdown({ content }: { content: string }) {
  return (
    <div className="ops-strategy-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

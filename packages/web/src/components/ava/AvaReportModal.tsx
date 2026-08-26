import { Button, Modal, Space, Typography } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { AvaAvatar } from './AvaAvatar.js'
import { AvaChatBubble } from './AvaChatBubble.js'
import './ava-chat.css'
import './ava-report.css'

const { Text } = Typography

export interface AvaReportMessage {
  role: 'user' | 'assistant'
  text: string
  revised?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  title: string
  messages: AvaReportMessage[]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Abre janela de impressão (Salvar como PDF) com a conversa renderizada. */
export function printAvaReport(title: string, messages: AvaReportMessage[]): void {
  const win = window.open('', '_blank', 'width=820,height=920')
  if (!win) return
  const body = messages
    .map((m) =>
      m.role === 'user'
        ? `<div class="msg msg-user"><div class="who">Você</div><div class="bubble bubble-user">${escapeHtml(m.text)}</div></div>`
        : `<div class="msg"><div class="who">Ava${m.revised ? ' · revisada' : ''}</div><div class="bubble bubble-ava">${escapeHtml(m.text)}</div></div>`,
    )
    .join('\n')
  win.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f1f1f; margin: 40px 48px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #888; font-size: 12px; margin-bottom: 24px; }
  .msg { margin-bottom: 14px; }
  .who { font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: #9333ea; margin-bottom: 3px; }
  .bubble { padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; }
  .bubble-user { background: #f0edff; }
  .bubble-ava { background: #fdf2f8; border: 1px solid #fbcfe8; }
  footer { margin-top: 32px; font-size: 10.5px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">Relatório gerado pelo AiyraCare · ${new Date().toLocaleString('pt-BR')}</div>
  ${body}
  <footer>Ava é apoio à comunicação familiar — não substitui avaliação médica. Emergência: SAMU 192.</footer>
</body>
</html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 350)
}

/** Modal "tela separada" com a conversa formatada + exportação PDF/impressão. */
export function AvaReportModal({ open, onClose, title, messages }: Props) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={720}
      title={title}
      footer={
        <Space>
          <Button icon={<PrinterOutlined />} onClick={() => printAvaReport(title, messages)}>
            Imprimir / Salvar PDF
          </Button>
          <Button type="primary" onClick={onClose}>
            Fechar
          </Button>
        </Space>
      }
    >
      <div className="ava-report-scroll" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
        {messages.length === 0 && (
          <Text type="secondary">Nada para exibir ainda.</Text>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={[
              'ava-report-msg',
              m.role === 'user' ? 'ava-report-msg--user' : 'ava-report-msg--ava',
            ].join(' ')}
          >
            {m.role === 'assistant' && <AvaAvatar size={30} />}
            <div className="ava-report-msg__content">
              <AvaChatBubble role={m.role} text={m.text} revised={m.revised} />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

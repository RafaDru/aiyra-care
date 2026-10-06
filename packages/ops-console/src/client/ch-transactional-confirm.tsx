import { Modal } from 'antd'

export type ChTransactionalActionId =
  | 'defect.start_fix'
  | 'defect.requeue_fix'
  | 'defect.mark_ready_pr'
  | 'defect.mark_fixed'
  | 'defect.approve_merge'
  | 'defect.request_changes'
  | 'incident.retry_dispatch'
  | 'incident.mark_complete'

const COPY: Record<
  ChTransactionalActionId,
  {
    title: string
    content: string
    okText: string
    okDanger?: boolean
  }
> = {
  'defect.start_fix': {
    title: 'Iniciar correção?',
    content:
      'O agente Correção Dev receberá o defeito e o status passará para Em correção.',
    okText: 'Iniciar',
  },
  'defect.requeue_fix': {
    title: 'Reenfileirar correção?',
    content: 'Um novo disparo será enviado sem alterar o status atual.',
    okText: 'Reenfileirar',
  },
  'defect.mark_ready_pr': {
    title: 'Marcar pronto para PR?',
    content: 'Use só se o PR já existir ou for criado manualmente.',
    okText: 'Marcar pronto',
  },
  'defect.mark_fixed': {
    title: 'Marcar como corrigido?',
    content:
      'O defeito será fechado no CH. Se o PR no GitHub ainda estiver aberto, faça o merge separadamente.',
    okText: 'Marcar corrigido',
    okDanger: true,
  },
  'defect.approve_merge': {
    title: 'Aprovar para merge?',
    content:
      'Registra sua aprovação (G3) e abre o PR no GitHub. O merge continua manual.',
    okText: 'Aprovar e abrir PR',
  },
  'defect.request_changes': {
    title: 'Pedir mudanças?',
    content: 'O defeito volta para Aberto para um novo ciclo de correção.',
    okText: 'Reabrir defeito',
    okDanger: true,
  },
  'incident.retry_dispatch': {
    title: 'Nova tentativa de triagem?',
    content: 'Reenvia o incidente para a fila de dispatch / automação.',
    okText: 'Reenviar',
  },
  'incident.mark_complete': {
    title: 'Concluir incidente?',
    content: 'Marca a triagem como concluída no CH.',
    okText: 'Concluir',
  },
}

export function confirmTransactionalAction(
  actionId: ChTransactionalActionId,
  onOk: () => void | Promise<void>,
  extraContent?: string,
): void {
  const spec = COPY[actionId]
  Modal.confirm({
    title: spec.title,
    content: extraContent ? `${spec.content} ${extraContent}` : spec.content,
    okText: spec.okText,
    cancelText: 'Cancelar',
    okButtonProps: spec.okDanger ? { danger: true } : undefined,
    onOk: () => onOk(),
  })
}

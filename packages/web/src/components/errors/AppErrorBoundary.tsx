import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, Button } from 'antd'
import { getClientErrorPlaybookMessage } from '../../lib/client-error-playbook.js'
import { reportUiBoundaryError } from '../../lib/client-errors.js'

interface Props {
  children: ReactNode
  feature?: string
}

interface State {
  hasError: boolean
  message: string
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
      message: getClientErrorPlaybookMessage('ui', 'ReactError'),
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const component = info.componentStack?.split('\n')[1]?.trim() ?? 'unknown'
    reportUiBoundaryError(component, error.name || 'Error')
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const message = this.props.feature
      ? getClientErrorPlaybookMessage(this.props.feature, 'ReactError')
      : this.state.message

    return (
      <div style={{ padding: 24, maxWidth: 560, margin: '40px auto' }}>
        <Alert
          type="error"
          showIcon
          message="Algo não funcionou como esperado"
          description={message}
          action={
            <Button size="small" onClick={this.handleReload}>
              Recarregar
            </Button>
          }
        />
      </div>
    )
  }
}

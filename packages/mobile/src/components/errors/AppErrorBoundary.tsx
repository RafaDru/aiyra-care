import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { getClientErrorPlaybookMessage } from '@/lib/client-error-playbook'
import { reportUiBoundaryError } from '@/lib/client-errors'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

interface Props {
  children: ReactNode
  feature?: string
  route?: string
}

interface State {
  hasError: boolean
  message: string
}

function ErrorFallback({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  const { tokens } = useAiyraTheme()
  return (
    <View style={[styles.wrap, { backgroundColor: tokens.colorBgLayout }]}>
      <Text style={[styles.title, { color: tokens.colorError }]}>Algo não funcionou</Text>
      <Text style={[styles.body, { color: tokens.colorTextSecondary }]}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={[styles.button, { backgroundColor: tokens.colorPrimary }]}
        accessibilityRole="button"
      >
        <Text style={styles.buttonLabel}>Tentar de novo</Text>
      </Pressable>
    </View>
  )
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
      message: getClientErrorPlaybookMessage('mobile_shell', 'ReactError'),
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const component = info.componentStack?.split('\n')[1]?.trim() ?? 'unknown'
    void reportUiBoundaryError(component, error.name || 'Error', {
      feature: this.props.feature,
      route: this.props.route,
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const message = this.props.feature
      ? getClientErrorPlaybookMessage(this.props.feature, 'ReactError')
      : this.state.message

    return <ErrorFallback message={message} onRetry={this.handleRetry} />
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  button: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  buttonLabel: { color: '#fff', fontWeight: '600' },
})

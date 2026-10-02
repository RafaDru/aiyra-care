import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bindClientErrorToast } from '@/lib/client-error-notify-bridge'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export type ToastKind = 'success' | 'error' | 'info'

type ToastPosition = 'top' | 'bottom'

type ToastPayload = {
  id: number
  kind: ToastKind
  message: string
  position: ToastPosition
}

type ToastOptions = {
  durationMs?: number
  position?: ToastPosition
}

type ToastContextValue = {
  show: (kind: ToastKind, message: string, options?: number | ToastOptions) => void
  success: (message: string, options?: number | ToastOptions) => void
  error: (message: string, options?: number | ToastOptions) => void
  info: (message: string, options?: number | ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 4500

function normalizeOptions(options?: number | ToastOptions): ToastOptions {
  if (typeof options === 'number') return { durationMs: options }
  return options ?? {}
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { tokens } = useAiyraTheme()
  const insets = useSafeAreaInsets()
  const [toast, setToast] = useState<ToastPayload | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef(0)

  const dismiss = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setToast(null)
    })
  }, [opacity])

  const show = useCallback(
    (kind: ToastKind, message: string, options?: number | ToastOptions) => {
      const { durationMs = DEFAULT_DURATION, position = 'top' } = normalizeOptions(options)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      idRef.current += 1
      setToast({ id: idRef.current, kind, message, position })
      opacity.setValue(0)
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      hideTimer.current = setTimeout(() => dismiss(), durationMs)
    },
    [dismiss, opacity],
  )

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    },
    [],
  )

  const value = useMemo(
    () => ({
      show,
      success: (message: string, options?: number | ToastOptions) => show('success', message, options),
      error: (message: string, options?: number | ToastOptions) => show('error', message, options),
      info: (message: string, options?: number | ToastOptions) => show('info', message, options),
    }),
    [show],
  )

  useEffect(() => {
    bindClientErrorToast(value)
    return () => bindClientErrorToast(null)
  }, [value])

  const accent =
    toast?.kind === 'error'
      ? tokens.colorError
      : toast?.kind === 'success'
        ? tokens.colorSuccess ?? tokens.colorPrimary
        : tokens.colorPrimary

  const hostStyle =
    toast?.position === 'bottom'
      ? { bottom: insets.bottom + 16, top: undefined }
      : { top: insets.top + 8, bottom: undefined }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="box-none" style={[styles.host, hostStyle, { opacity }]}>
          <Pressable
            onPress={dismiss}
            style={[
              styles.banner,
              {
                backgroundColor: tokens.colorBgContainer,
                borderColor: accent,
                shadowColor: '#000',
              },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.message, { color: tokens.colorTextBase }]}>{toast.message}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  message: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
})

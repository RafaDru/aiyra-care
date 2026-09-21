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
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export type ToastKind = 'success' | 'error' | 'info'

type ToastPayload = {
  id: number
  kind: ToastKind
  message: string
}

type ToastContextValue = {
  show: (kind: ToastKind, message: string, durationMs?: number) => void
  success: (message: string, durationMs?: number) => void
  error: (message: string, durationMs?: number) => void
  info: (message: string, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 4500

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
    (kind: ToastKind, message: string, durationMs = DEFAULT_DURATION) => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      idRef.current += 1
      setToast({ id: idRef.current, kind, message })
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
      success: (message: string, durationMs?: number) => show('success', message, durationMs),
      error: (message: string, durationMs?: number) => show('error', message, durationMs),
      info: (message: string, durationMs?: number) => show('info', message, durationMs),
    }),
    [show],
  )

  const accent =
    toast?.kind === 'error'
      ? tokens.colorError
      : toast?.kind === 'success'
        ? tokens.colorSuccess ?? tokens.colorPrimary
        : tokens.colorPrimary

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.host, { top: insets.top + 8, opacity }]}
        >
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

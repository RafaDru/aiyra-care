import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, StyleSheet, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  children: ReactNode
  onScrollReady?: (scrollToFocused: () => void) => void
  header?: ReactNode
}

export function AuthScreen({ children, onScrollReady, header }: Props) {
  const { tokens } = useAiyraTheme()
  const insets = useSafeAreaInsets()
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true))
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const scrollRef = useRef<unknown>(null)

  const scrollToFocused = useCallback(() => {
    const ref = scrollRef.current as { scrollToEnd?: (animated?: boolean) => void } | null
    ref?.scrollToEnd?.(true)
  }, [])

  useEffect(() => {
    onScrollReady?.(scrollToFocused)
  }, [onScrollReady, scrollToFocused])

  return (
    <View style={[styles.flex, { backgroundColor: tokens.colorBgLayout, paddingTop: insets.top }]}>
      <KeyboardAwareScrollView
        innerRef={(ref: unknown) => {
          scrollRef.current = ref
        }}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Platform.OS === 'ios' ? 80 : 120}
        extraHeight={Platform.OS === 'android' ? 140 : 0}
        keyboardOpeningTime={0}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: insets.bottom + 32,
            justifyContent: keyboardVisible ? 'flex-start' : 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!keyboardVisible && header ? <View style={styles.header}>{header}</View> : null}
        <View style={styles.inner}>{children}</View>
      </KeyboardAwareScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8 },
  header: { alignItems: 'center', marginBottom: 8 },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16 },
})

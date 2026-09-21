import type { ReactNode, RefObject } from 'react'
import { useEffect, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollView as ScrollViewType,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  children: ReactNode
  scrollRef?: RefObject<ScrollViewType | null>
  onScrollReady?: (scrollToFocused: () => void) => void
}

export function AuthScreen({ children, scrollRef, onScrollReady }: Props) {
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

  useEffect(() => {
    if (!onScrollReady) return
    onScrollReady(() => {
      scrollRef?.current?.scrollTo({ y: 220, animated: true })
    })
  }, [onScrollReady, scrollRef])

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: tokens.colorBgLayout }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 12 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + (keyboardVisible ? 32 : 48),
            justifyContent: keyboardVisible ? 'flex-start' : 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16 },
})

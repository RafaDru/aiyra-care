import { createContext, useContext, type ReactNode } from 'react'

const DesignPreviewModeContext = createContext(false)

export function DesignPreviewModeProvider({ children }: { children: ReactNode }) {
  return <DesignPreviewModeContext.Provider value={true}>{children}</DesignPreviewModeContext.Provider>
}

export function useDesignPreviewMode(): boolean {
  return useContext(DesignPreviewModeContext)
}
/**
 * TypeScript / fallback entry. Metro resolves `AvaMarkdown.native.tsx` (iOS/Android)
 * and `AvaMarkdown.web.tsx` (web) ahead of this file so markdown-it stays off native bundles.
 */
export { AvaMarkdown } from './AvaMarkdown.native'

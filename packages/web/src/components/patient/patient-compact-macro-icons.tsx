import type { ReactNode } from 'react'
import { FolderOutlined, IdcardOutlined, SnippetsOutlined, UserOutlined } from '@ant-design/icons'
import type { PatientSection } from '../../lib/patient-navigation.js'

/** Ícones macro PAT compact — paridade Canvas (clipboard + crachá). */
export const PATIENT_COMPACT_MACRO_ICONS: Record<PatientSection, ReactNode> = {
  overview: <UserOutlined />,
  clinical: <SnippetsOutlined />,
  plan: <IdcardOutlined />,
  files: <FolderOutlined />,
}
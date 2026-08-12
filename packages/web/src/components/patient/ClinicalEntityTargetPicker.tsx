import { useEffect, useMemo, useState } from 'react'
import { Empty, Select, Tabs } from 'antd'
import type { ClinicalEntityTargetGroup, ClinicalEntityTargetOption } from './clinical-entity-target-options.js'
import { CLINICAL_ENTITY_TARGET_TABS, targetGroupForValue } from './clinical-entity-target-options.js'

interface ClinicalEntityTargetPickerProps {
  options: ClinicalEntityTargetOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}

export function ClinicalEntityTargetPicker({
  options,
  value,
  onChange,
  placeholder = 'Selecione o registro',
}: ClinicalEntityTargetPickerProps) {
  const [activeTab, setActiveTab] = useState<ClinicalEntityTargetGroup>('medical_record')

  const grouped = useMemo(() => {
    const map: Record<ClinicalEntityTargetGroup, ClinicalEntityTargetOption[]> = {
      medical_record: [],
      authorization: [],
      exam: [],
    }
    for (const opt of options) map[opt.group].push(opt)
    return map
  }, [options])

  useEffect(() => {
    const group = targetGroupForValue(options, value)
    if (group) setActiveTab(group)
  }, [value, options])

  const tabItems = CLINICAL_ENTITY_TARGET_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    children:
      grouped[tab.key].length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum registro nesta aba" />
      ) : (
        <Select
          value={value}
          options={grouped[tab.key]}
          placeholder={placeholder}
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          onChange={(next) => onChange?.(next)}
        />
      ),
  }))

  return (
    <Tabs
      size="small"
      activeKey={activeTab}
      onChange={(key) => setActiveTab(key as ClinicalEntityTargetGroup)}
      items={tabItems}
    />
  )
}

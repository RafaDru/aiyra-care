import { useEffect, useMemo, useState } from 'react'
import { CalendarOutlined } from '@ant-design/icons'
import { Empty, Select, Space, Tag, Typography, Tabs } from 'antd'
import type { ClinicalEntityTargetGroup, ClinicalEntityTargetOption } from './clinical-entity-target-options.js'
import { CLINICAL_ENTITY_TARGET_TABS, targetGroupForValue } from './clinical-entity-target-options.js'
import { SourceTag } from '../ui/SourceTag.js'

const { Text } = Typography

interface ClinicalEntityTargetPickerProps {
  options: ClinicalEntityTargetOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}

function renderOptionLabel(opt: ClinicalEntityTargetOption) {
  return (
    <div style={{ padding: '2px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <Space size={6} align="center" style={{ flex: 1, minWidth: 0 }}>
          <Tag color="cyan" icon={<CalendarOutlined />} style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
            {opt.dateFormatted}
          </Tag>
          <Text strong style={{ fontSize: 13, wordBreak: 'break-word' }}>
            {opt.title}
          </Text>
        </Space>
        <Space size={4}>
          {opt.status && (
            <Tag color={opt.status === 'authorized' ? 'blue' : opt.status === 'used' ? 'green' : 'default'} style={{ margin: 0, fontSize: 10 }}>
              {opt.status}
            </Tag>
          )}
          {opt.source && <SourceTag source={opt.source} />}
        </Space>
      </div>
      {opt.subtitle && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2, paddingLeft: 2 }}>
          {opt.subtitle}
        </Text>
      )}
    </div>
  )
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

  const selectOptionsForTab = (group: ClinicalEntityTargetGroup) =>
    grouped[group].map((opt) => ({
      value: opt.value,
      label: opt.searchValue, // Usado no filtro de busca
      searchValue: opt.searchValue,
      rawOption: opt,
    }))

  const tabItems = CLINICAL_ENTITY_TARGET_TABS.map((tab) => ({
    key: tab.key,
    label: `${tab.label} (${grouped[tab.key].length})`,
    children:
      grouped[tab.key].length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum registro disponível nesta aba" />
      ) : (
        <Select
          value={value}
          options={selectOptionsForTab(tab.key)}
          placeholder={placeholder}
          showSearch
          optionFilterProp="searchValue"
          style={{ width: '100%' }}
          dropdownStyle={{ minWidth: 360, maxWidth: '90vw' }}
          onChange={(next) => onChange?.(next)}
          optionRender={(option) => {
            const raw = (option.data as { rawOption?: ClinicalEntityTargetOption }).rawOption
            return raw ? renderOptionLabel(raw) : option.label
          }}
          labelRender={(item) => {
            const raw = (item as { rawOption?: ClinicalEntityTargetOption }).rawOption
            if (!raw) return item.label
            return (
              <Space size={6}>
                <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                  {raw.dateFormatted}
                </Tag>
                <Text strong style={{ fontSize: 12 }}>
                  {raw.title}
                </Text>
                {raw.subtitle && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    ({raw.subtitle})
                  </Text>
                )}
              </Space>
            )
          }}
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

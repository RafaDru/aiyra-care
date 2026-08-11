import { Table, Typography } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { ALIGNED_TABLE_FRAME_STYLE } from './aligned-table-columns.js'

const { Text } = Typography

export interface AlignedTableGroup<T> {
  key: string
  title: string
  data: T[]
  /** Conteúdo quando `data` está vazio (ex.: Empty). */
  empty?: React.ReactNode
}

interface Props<T extends object> {
  groups: AlignedTableGroup<T>[]
  columns: ColumnsType<T>
  rowKey: keyof T | ((row: T) => string)
  expandable?: TableProps<T>['expandable']
  onRow?: TableProps<T>['onRow']
  /** Oculta grupos sem linhas (ignora `empty`). */
  hideEmptyGroups?: boolean
  groupSpacing?: number
}

/**
 * Tabelas por grupo com as mesmas colunas e `tableLayout="fixed"`.
 * Garante alinhamento horizontal entre grupos (regra padrão da UI).
 */
export function GroupedAlignedTables<T extends object>({
  groups,
  columns,
  rowKey,
  expandable,
  onRow,
  hideEmptyGroups = false,
  groupSpacing = 24,
}: Props<T>) {
  return (
    <>
      {groups.map((group) => {
        if (hideEmptyGroups && group.data.length === 0) return null

        return (
          <div key={group.key} style={{ marginBottom: groupSpacing }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{group.title}</Text>
            {group.data.length === 0 ? (
              group.empty ?? null
            ) : (
              <Table<T>
                size="small"
                pagination={false}
                tableLayout="fixed"
                dataSource={group.data}
                rowKey={rowKey}
                columns={columns}
                expandable={expandable}
                onRow={onRow}
                style={ALIGNED_TABLE_FRAME_STYLE}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

import { Alert, Descriptions, Space, Table, Tag, Typography } from 'antd'
import type { OpsMetricsResponse } from './ops.types.js'
import { OpsPanel } from './components/OpsPanel.js'
import { OpsKpiCard, OpsKpiGrid } from './components/OpsKpiCard.js'

const { Text, Link } = Typography

const PARITY_ROWS = [
  { area: 'Auth', mobile: 'E-mail/senha, Google OAuth, criar conta', web: 'Completo (+ Microsoft)', status: 'partial' },
  { area: 'Pacientes / Início', mobile: 'Lista + perfil read-only', web: 'CRUD completo', status: 'partial' },
  { area: 'Carteira / Convênios / Exames', mobile: 'Leitura + link web', web: 'Sync, QR, marcadores, vincular plano', status: 'partial' },
  { area: 'Integrações', mobile: 'Status + abrir web', web: 'Login portal + sync', status: 'web-only' },
  { area: 'Ava companion', mobile: 'FAB + chat SSE', web: 'Dock global', status: 'partial' },
  { area: 'Família / compliance', mobile: 'Hub + convites + gate legal', web: 'Paridade', status: 'ok' },
] as const

const STATUS_COLOR: Record<string, string> = {
  ok: 'success',
  partial: 'processing',
  'web-only': 'warning',
}

export function MobilePanel({ data }: { data: OpsMetricsResponse }) {
  const metrics = data.metrics
  const mobileErrors = metrics.clientErrorFingerprints24h.filter((r) => r.feature.includes('mobile'))
  const hotMobile = metrics.featureHealth24h.filter((f) => f.featureKey.includes('mobile'))

  return (
    <div className="ops-panel-stack">
      <Alert
        type="info"
        showIcon
        message="App mobile (Expo SDK 57)"
        description={
          <Space direction="vertical" size={4}>
            <Text>
              Shell React Native espelhando jornadas principais — não substitui o web para sync, scrapers ou uploads.
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Feature card: <Text code>docs/features/mobile-app-shell.md</Text> · QA:{' '}
              <Text code>npm run qa:run:mobile</Text> · Package: <Text code>packages/mobile</Text>
            </Text>
          </Space>
        }
      />

      <OpsKpiGrid>
        <OpsKpiCard
          label="Erros cliente (mobile*)"
          value={mobileErrors.reduce((n, r) => n + r.count, 0)}
          hint={`${mobileErrors.length} fingerprints · 24h`}
          alert={mobileErrors.length > 0}
        />
        <OpsKpiCard
          label="Features mobile no mapa"
          value={hotMobile.length}
          hint="Chaves com prefixo mobile no catálogo ops"
        />
        <OpsKpiCard
          label="Metro (dev)"
          value=":8081"
          hint="Logs opcionais na aba Infra → Stack"
        />
        <OpsKpiCard
          label="API alvo"
          value={metrics.probe?.api.ok ? 'ok' : 'down'}
          hint="EXPO_PUBLIC_API_URL no dispositivo"
          alert={metrics.probe ? !metrics.probe.api.ok : false}
        />
      </OpsKpiGrid>

      <OpsPanel
        title="Paridade web × mobile"
        description="Referência para priorização — atualizar com o roadmap plat-mobile."
      >
        <Table
          size="small"
          pagination={false}
          rowKey="area"
          dataSource={[...PARITY_ROWS]}
          columns={[
            { title: 'Área', dataIndex: 'area', width: 140 },
            { title: 'Mobile', dataIndex: 'mobile' },
            { title: 'Web', dataIndex: 'web', width: 200 },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 100,
              render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
            },
          ]}
        />
      </OpsPanel>

      <OpsPanel title="Dev rápido" description="Checklist para Rafael / worker local.">
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Variáveis">
            <Text code>EXPO_PUBLIC_SUPABASE_*</Text>, <Text code>EXPO_PUBLIC_API_URL</Text> (IP LAN),{' '}
            <Text code>EXPO_PUBLIC_WEB_APP_URL</Text> (OAuth bridge)
          </Descriptions.Item>
          <Descriptions.Item label="Stack">
            API <Text code>:3010</Text> + Web <Text code>:5173</Text> na mesma rede do celular
          </Descriptions.Item>
          <Descriptions.Item label="OAuth Google">
            Redirect <Text code>/mobile-oauth-return</Text> no web · ver <Text code>docs/SUPABASE.md</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Documentação">
            <Link href="https://github.com/RafaDru/aiyra-care/blob/main/packages/mobile/README.md" target="_blank">
              packages/mobile/README.md
            </Link>
          </Descriptions.Item>
        </Descriptions>
      </OpsPanel>
    </div>
  )
}

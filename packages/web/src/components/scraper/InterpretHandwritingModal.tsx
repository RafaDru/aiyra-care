import { useEffect, useState } from 'react'
import { Alert, App, Button, Descriptions, List, Modal, Space, Tag, Typography } from 'antd'
import { BulbOutlined, MedicineBoxOutlined } from '@ant-design/icons'
import { api } from '../../lib/api.js'
import type { Document_, HandwritingQuota, PrescriptionInterpretation } from '../../lib/api.types.js'
import { AiInsightCard } from '../ui/AiInsightCard.js'
import { DismissibleHint } from '../ui/DismissibleHint.js'

const HANDWRITING_TYPES = new Set(['prescription', 'exam', 'report'])

interface Props {
  document: Document_ | null
  patientId: string
  open: boolean
  onClose: () => void
  onMedicationsCreated?: () => void
}

const { Text, Paragraph } = Typography

export function InterpretHandwritingModal({ document, patientId, open, onClose, onMedicationsCreated }: Props) {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [creatingMeds, setCreatingMeds] = useState(false)
  const [interpretation, setInterpretation] = useState<PrescriptionInterpretation | null>(null)
  const [quota, setQuota] = useState<HandwritingQuota | null>(null)

  useEffect(() => {
    if (!open) return
    setInterpretation(null)
    api.handwritingCredits.quota().then(setQuota).catch(() => {})
    if (document) {
      api.documents.getInterpretation(document.id).then((r) => {
        if (r.interpretation) setInterpretation(r.interpretation as PrescriptionInterpretation)
      }).catch(() => {})
    }
  }, [open, document])

  const runInterpret = async () => {
    if (!document) return
    setLoading(true)
    try {
      const result = await api.documents.interpretHandwriting(document.id)
      setInterpretation(result.interpretation)
      setQuota(result.quota)
      message.success(
        result.tier === 'free'
          ? 'Interpretação concluída (free tier — Gemini/Groq)'
          : 'Interpretação concluída (pacote premium — modelos avançados)',
      )
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro na interpretação')
    } finally {
      setLoading(false)
    }
  }

  const createMedications = async () => {
    if (!interpretation?.items.length) return
    setCreatingMeds(true)
    try {
      for (const item of interpretation.items) {
        if (!item.medication?.trim()) continue
        const notes = [
          item.instructions,
          item.route ? `Via: ${item.route}` : null,
        ].filter(Boolean).join(' · ')
        await api.medications.create({
          patientId,
          genericName: item.medication,
          dosage: item.dose || undefined,
          frequency: item.frequency || undefined,
          route: item.route || undefined,
          duration: item.duration || undefined,
          prescribingDoctor: interpretation.doctorName || undefined,
          notes: notes || undefined,
          isActive: true,
          startDate: interpretation.issueDate || undefined,
        })
      }
      message.success('Medicações cadastradas — revise na aba Medicações')
      onMedicationsCreated?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro ao cadastrar medicações')
    } finally {
      setCreatingMeds(false)
    }
  }

  if (!document) return null

  return (
    <Modal
      open={open}
      title={<><BulbOutlined /> Interpretar manuscrito</>}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="close" onClick={onClose}>Fechar</Button>,
        <Button
          key="interpret"
          type="primary"
          loading={loading}
          disabled={!quota?.interpretationEnabled || (quota?.totalAvailable ?? 0) <= 0}
          onClick={() => void runInterpret()}
        >
          Interpretar (1 crédito)
        </Button>,
        interpretation?.items.length ? (
          <Button
            key="meds"
            icon={<MedicineBoxOutlined />}
            loading={creatingMeds}
            onClick={() => void createMedications()}
          >
            Cadastrar medicações
          </Button>
        ) : null,
      ]}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {quota && (
          <Alert
            type={quota.totalAvailable > 0 ? 'info' : 'warning'}
            showIcon
            message={
              quota.interpretationEnabled
                ? `Créditos: ${quota.totalAvailable} (${quota.monthlyFreeRemaining} grátis/mês + ${quota.packageCredits} pacote)`
                : 'Interpretação desabilitada — configure GEMINI_API_KEY ou GROQ_API_KEY'
            }
            description={
              quota.pricing ? (
                <>
                  <div><Text strong>Franquia mensal:</Text> {quota.pricing.freeTierLabel} ({quota.pricing.freeTierProviders.join(', ')})</div>
                  <div><Text strong>Pacote pago:</Text> {quota.pricing.premiumTierLabel} ({quota.pricing.premiumTierProviders.join(', ')})</div>
                  <div style={{ marginTop: 4 }}>OCR no upload continua local e gratuito. Cada interpretação consome 1 crédito da franquia ou do pacote.</div>
                </>
              ) : 'OCR local no upload é grátis. Interpretação consome 1 crédito por clique.'
            }
          />
        )}

        <Text type="secondary">{document.originalFilename}</Text>

        {interpretation ? (
          <AiInsightCard size="small" title="Análise da IA">
            <Descriptions size="small" column={1} bordered>
              {interpretation.patientName && <Descriptions.Item label="Paciente">{interpretation.patientName}</Descriptions.Item>}
              {interpretation.doctorName && <Descriptions.Item label="Médico">{interpretation.doctorName}</Descriptions.Item>}
              {interpretation.doctorCrm && <Descriptions.Item label="CRM">{interpretation.doctorCrm}</Descriptions.Item>}
              {interpretation.issueDate && <Descriptions.Item label="Data">{interpretation.issueDate}</Descriptions.Item>}
              {interpretation.clinicName && <Descriptions.Item label="Clínica">{interpretation.clinicName}</Descriptions.Item>}
            </Descriptions>

            <List
              header={<Text strong>Itens identificados</Text>}
              size="small"
              dataSource={interpretation.items}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <Text strong>{item.medication}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {[item.dose, item.frequency, item.duration, item.route].filter(Boolean).join(' · ')}
                    </Text>
                    {item.confidence != null && (
                      <Tag color={item.confidence >= 0.7 ? 'green' : 'orange'} style={{ marginTop: 4 }}>
                        confiança {(item.confidence * 100).toFixed(0)}%
                      </Tag>
                    )}
                  </Space>
                </List.Item>
              )}
            />

            {interpretation.warnings.length > 0 && (
              <Alert type="warning" showIcon message="Incertezas" description={interpretation.warnings.join(' · ')} />
            )}

            <Paragraph style={{ fontSize: 12, background: 'var(--card-bg)', padding: 12, borderRadius: 12, marginTop: 12 }}>
              <Text strong>Transcrição:</Text>
              <br />
              {interpretation.rawTranscription}
            </Paragraph>
          </AiInsightCard>
        ) : (
          <DismissibleHint
            hintId="interpret-handwriting.intro"
            type="info"
            showIcon
            message="Interpretação sob demanda"
            description="Ideal para receitas manuscritas. Revise sempre antes de administrar medicamentos ou cadastrar no prontuário."
          />
        )}
      </Space>
    </Modal>
  )
}

export function isHandwritingClinicalType(type: string): boolean {
  return HANDWRITING_TYPES.has(type)
}

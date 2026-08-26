import { useState } from 'react'
import { Button, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { AvaSessionPin, Patient } from '../../lib/api.types.js'
import type { AvaEntityPin } from '../../lib/ava-dock-bus.js'

function pinToEntity(pin: AvaSessionPin): AvaEntityPin {
  if (pin.entityType === 'exam_marker') {
    return { entityType: 'exam_marker', markerName: pin.entityId }
  }
  return { entityType: pin.entityType, entityId: pin.entityId }
}

interface Props {
  patients: Patient[]
  conversationId: string | null
  currentPatientId: string
  onApplyPatientChange: (patientId: string) => void
}

export function useAvaPatientSwitchHook({
  patients,
  conversationId,
  currentPatientId,
  onApplyPatientChange,
}: Props) {
  const { t } = useTranslation()
  const [switchOpen, setSwitchOpen] = useState(false)
  const [pendingPatientId, setPendingPatientId] = useState<string | null>(null)
  const [otherPins, setOtherPins] = useState<AvaSessionPin[]>([])

  const requestPatientChange = async (newPatientId: string) => {
    if (newPatientId === currentPatientId) return

    if (!conversationId) {
      onApplyPatientChange(newPatientId)
      return
    }

    try {
      const ctx = await api.ava.getContext(conversationId)
      const foreign = ctx.pins.filter((p) => p.patientId !== newPatientId)
      if (!foreign.length) {
        onApplyPatientChange(newPatientId)
        return
      }
      setOtherPins(foreign)
      setPendingPatientId(newPatientId)
      setSwitchOpen(true)
    } catch {
      onApplyPatientChange(newPatientId)
    }
  }

  const otherNames = otherPins
    .map((p) => patients.find((pt) => pt.id === p.patientId)?.name ?? p.patientId)
    .filter((name, i, arr) => arr.indexOf(name) === i)
    .join(', ')

  const closeModal = () => {
    setSwitchOpen(false)
    setPendingPatientId(null)
    setOtherPins([])
  }

  const applyKeepPins = () => {
    if (pendingPatientId) onApplyPatientChange(pendingPatientId)
    closeModal()
  }

  const applyRemovePins = async () => {
    if (conversationId && otherPins.length) {
      try {
        for (const pin of otherPins) {
          await api.ava.patchContext(conversationId, { unpin: pinToEntity(pin) })
        }
      } catch {
        // segue com troca de lente
      }
    }
    applyKeepPins()
  }

  const patientSwitchModal = (
    <Modal
      open={switchOpen}
      title={t('ava.patientSwitchTitle')}
      onCancel={closeModal}
      footer={[
        <Button key="remove" onClick={() => void applyRemovePins()}>
          {t('ava.patientSwitchRemove')}
        </Button>,
        <Button key="keep" type="primary" onClick={applyKeepPins}>
          {t('ava.patientSwitchKeep')}
        </Button>,
      ]}
    >
      {t('ava.patientSwitchBody', { names: otherNames })}
    </Modal>
  )

  return { requestPatientChange, patientSwitchModal }
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, Drawer } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Patient } from '../../lib/api.types.js'
import { useCompactPatientChrome } from '../../contexts/CompactPatientChromeContext.js'

const HEADER_SLOT_ID = 'app-header-patient-ctx-slot'

interface Props {
  patient: Patient
  patients: Patient[]
  heroSentinelRef: React.RefObject<HTMLElement | null>
  onPinnedChange?: (pinned: boolean) => void
  /** Controlado opcional — mesmo sheet que o acelerador no hero S0. */
  sheetOpen?: boolean
  onSheetOpenChange?: (open: boolean) => void
}

/**
 * PAT-CTX-1 — chip de pessoa no header compacto (coração + nome) ao rolar o hero.
 */
export function PatientCompactPersonContextBar({
  patient,
  patients,
  heroSentinelRef,
  onPinnedChange,
  sheetOpen: sheetOpenProp,
  onSheetOpenChange,
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { progress, setChrome } = useCompactPatientChrome()
  const [sheetOpenInternal, setSheetOpenInternal] = useState(false)
  const sheetOpen = sheetOpenProp ?? sheetOpenInternal
  const setSheetOpen = onSheetOpenChange ?? setSheetOpenInternal
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null)
  const pinnedRef = useRef(false)

  useEffect(() => {
    setChrome({ patientFocus: true })
  }, [patient.id, setChrome])

  useEffect(() => {
    const updateSlot = () => setSlotEl(document.getElementById(HEADER_SLOT_ID))
    updateSlot()
    const id = window.requestAnimationFrame(updateSlot)
    return () => window.cancelAnimationFrame(id)
  }, [progress])

  useEffect(() => {
    const sentinel = heroSentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        const pinned = !entry.isIntersecting
        if (pinnedRef.current !== pinned) {
          pinnedRef.current = pinned
          onPinnedChange?.(pinned)
        }
      },
      { root: null, rootMargin: '-8px 0px 0px 0px', threshold: 0 },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [heroSentinelRef, patient.id, onPinnedChange])

  const others = patients.filter((p) => p.id !== patient.id)
  const showChip = progress > 0.18

  const chip = (
    <button
      type="button"
      className="patient-compact-person-ctx__trigger"
      style={{
        opacity: Math.min(1, Math.max(0.35, progress)),
        pointerEvents: progress > 0.35 ? 'auto' : 'none',
      }}
      aria-label={t('patient.compactContextAria', { name: patient.name })}
      onClick={() => setSheetOpen(true)}
    >
      <Avatar
        size={28}
        src={patient.photoUrl}
        className="patient-compact-person-ctx__avatar"
        style={{
          backgroundColor: patient.gender === 'female' ? '#EC4899' : '#4F46E5',
          flexShrink: 0,
        }}
      >
        {patient.name.charAt(0).toUpperCase()}
      </Avatar>
      <span className="patient-compact-person-ctx__name">{patient.name}</span>
      <DownOutlined className="patient-compact-person-ctx__chev" aria-hidden />
    </button>
  )

  return (
  <>
      {showChip && slotEl ? createPortal(chip, slotEl) : null}

      <Drawer
        title={t('patient.compactContextSheetTitle')}
        placement="bottom"
        height="min(72vh, 480px)"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        className="patient-compact-person-ctx__sheet"
        destroyOnClose
      >
        <ul className="patient-compact-person-ctx__list" role="listbox" aria-label={t('patient.compactContextSheetTitle')}>
          {patients.map((p) => {
            const current = p.id === patient.id
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={current}
                  className={`patient-compact-person-ctx__list-item${current ? ' patient-compact-person-ctx__list-item--active' : ''}`}
                  onClick={() => {
                    setSheetOpen(false)
                    if (!current) navigate(`/patients/${p.id}`)
                  }}
                >
                  <Avatar
                    size={32}
                    src={p.photoUrl}
                    style={{
                      backgroundColor: p.gender === 'female' ? '#EC4899' : '#4F46E5',
                    }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <span>{p.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {others.length === 0 ? (
          <p className="patient-compact-person-ctx__hint">{t('patient.emptyFamilyWelcomeHint')}</p>
        ) : null}
      </Drawer>
    </>
  )
}
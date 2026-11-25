import { useEffect, useRef, useState } from 'react'
import { Avatar, Drawer } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Patient } from '../../lib/api.types.js'

interface Props {
  patient: Patient
  patients: Patient[]
  heroSentinelRef: React.RefObject<HTMLElement | null>
  onPinnedChange?: (pinned: boolean) => void
}

/**
 * PAT-CTX-1 — barra compacta abaixo do header quando o hero do perfil sai da viewport.
 */
export function PatientCompactPersonContextBar({ patient, patients, heroSentinelRef, onPinnedChange }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [pinned, setPinned] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = heroSentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        const next = !entry.isIntersecting
        setPinned(next)
        onPinnedChange?.(next)
      },
      { root: null, rootMargin: '0px', threshold: 0 },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [heroSentinelRef, patient.id, onPinnedChange])

  const others = patients.filter((p) => p.id !== patient.id)

  return (
    <>
      <div
        ref={barRef}
        className={`patient-compact-person-ctx${pinned ? ' patient-compact-person-ctx--visible' : ''}`}
        aria-hidden={!pinned}
        data-testid="patient-compact-person-ctx"
      >
        <button
          type="button"
          className="patient-compact-person-ctx__trigger"
          aria-label={t('patient.compactContextAria', { name: patient.name })}
          onClick={() => setSheetOpen(true)}
        >
          <Avatar
            size={24}
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
      </div>

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
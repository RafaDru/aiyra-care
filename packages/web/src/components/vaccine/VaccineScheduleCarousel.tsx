import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button, Popover, Typography } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { VaccineDoseRow, VaccineTimelineView } from './vaccine-view-utils.js'
import { DOSE_STATUS_COLOR, formatCalendarMonthYear } from './vaccine-display-helpers.js'

import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'

const { Text, Title } = Typography

const DESKTOP_MIN_COL = 108
const MOBILE_MIN_COL = 80
const MOBILE_BREAKPOINT = 768

const SCROLL_HIDE: CSSProperties = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}

interface Props {
  timeline: VaccineTimelineView
  birthDate?: string | null
}

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return coarse
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return mobile
}

function DoseChipPopover({
  row,
  isExtra,
  touchMode,
}: {
  row: VaccineDoseRow
  isExtra: boolean
  touchMode: boolean
}) {
  const color = DOSE_STATUS_COLOR[row.visualStatus]

  const content = (
    <div style={{ maxWidth: 280 }}>
      <Text strong style={{ display: 'block', marginBottom: 4 }}>
        {row.displayName} · {row.doseLabel}
      </Text>
      <Text style={{ display: 'block', fontSize: 13, color }}>{row.primaryLine}</Text>
      {row.secondaryLine && (
        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
          {row.secondaryLine}
        </Text>
      )}
      {row.confirmationLine && (
        <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 6 }}>
          {row.confirmationLine}
          {row.batch ? ` · Lote ${row.batch}` : ''}
        </Text>
      )}
      {isExtra && (
        <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 6 }}>
          Fora do calendário PNI catalogado
        </Text>
      )}
    </div>
  )

  return (
    <Popover
      content={content}
      title={null}
      trigger={touchMode ? 'click' : 'hover'}
      placement="top"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: touchMode ? '8px 10px' : '6px 8px',
          borderRadius: 8,
          background: isExtra ? '#FDF4FF' : '#FFFFFF',
          border: isExtra ? '1px dashed #C084FC' : '1px solid rgba(15, 23, 42, 0.1)',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          cursor: touchMode ? 'pointer' : 'default',
          minWidth: 0,
          touchAction: 'manipulation',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span
          style={{
            width: touchMode ? 10 : 8,
            height: touchMode ? 10 : 8,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            boxShadow: `0 0 0 1px ${color}`,
          }}
        />
        <Text
          style={{
            fontSize: touchMode ? 12 : 11,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
          }}
        >
          {row.displayName}
        </Text>
      </div>
    </Popover>
  )
}

function columnChrome(
  ageMonths: number,
  childAgeMonths: number,
  hasSlots: boolean,
): { headerBg: string; bodyBg: string; border: string; headerColor: string } {
  const isFirstYear = ageMonths < 12
  const isFuture = ageMonths > childAgeMonths
  const isCurrent = ageMonths === childAgeMonths
  const isYear = ageMonths > 0 && ageMonths % 12 === 0

  if (isFuture && !hasSlots) {
    return {
      headerBg: '#F8F9FA',
      bodyBg: '#FAFAFA',
      border: '1px dashed #E2E8F0',
      headerColor: '#94A3B8',
    }
  }
  if (isFuture && hasSlots) {
    return {
      headerBg: isFirstYear ? '#F5F0FF' : '#EEF2F6',
      bodyBg: isFirstYear ? '#FAF7FF' : '#F4F6F9',
      border: `1px solid ${isFirstYear ? '#DDD6FE' : '#CBD5E1'}`,
      headerColor: isFirstYear ? '#9333EA' : '#475569',
    }
  }
  if (isCurrent) {
    return {
      headerBg: '#EDE9FE',
      bodyBg: '#F5F3FF',
      border: `1px solid ${AIYRACARE_TOKENS.colorPrimary}`,
      headerColor: AIYRACARE_TOKENS.colorPrimary,
    }
  }
  if (hasSlots && isFirstYear) {
    return {
      headerBg: '#F3E8FF',
      bodyBg: '#FAF5FF',
      border: '1px solid #DDD6FE',
      headerColor: '#553C9A',
    }
  }
  if (hasSlots && isYear) {
    return {
      headerBg: '#EEF2FF',
      bodyBg: '#F8FAFC',
      border: '1px solid #C7D2FE',
      headerColor: '#4338CA',
    }
  }
  if (hasSlots) {
    return {
      headerBg: '#F1F5F9',
      bodyBg: '#F8FAFC',
      border: '1px solid #E2E8F0',
      headerColor: '#334155',
    }
  }
  return {
    headerBg: '#F1F5F9',
    bodyBg: 'transparent',
    border: '1px solid #EBEBEB',
    headerColor: '#94A3B8',
  }
}

function TimelineColumn({
  column,
  childAgeMonths,
  colWidth,
  fillsViewport,
  touchMode,
  calendarRef,
}: {
  column: VaccineTimelineView['columns'][number]
  childAgeMonths: number
  colWidth: number
  fillsViewport: boolean
  touchMode: boolean
  calendarRef?: string | null
}) {
  const hasSlots = column.catalogRows.length > 0 || column.extraRows.length > 0
  const minCol = touchMode ? MOBILE_MIN_COL : DESKTOP_MIN_COL
  const isCurrentAge = column.ageMonths === childAgeMonths
  const chrome = columnChrome(column.ageMonths, childAgeMonths, hasSlots)

  return (
    <div
      className="vaccine-timeline-col"
      data-age-months={column.ageMonths}
      style={{
        flex: fillsViewport ? '1 1 0' : `0 0 ${colWidth}px`,
        width: fillsViewport ? undefined : colWidth,
        minWidth: fillsViewport ? minCol : colWidth,
        scrollSnapAlign: 'center',
        padding: '0 3px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          borderRadius: 10,
          border: chrome.border,
          background: chrome.bodyBg,
          overflow: 'hidden',
          minHeight: 56,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: touchMode ? '10px 8px' : '8px 6px',
            background: chrome.headerBg,
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          {calendarRef && (
            <Text
              style={{
                fontSize: touchMode ? 10 : 9,
                display: 'block',
                marginBottom: 2,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                color: chrome.headerColor,
                opacity: 0.85,
              }}
            >
              {calendarRef}
            </Text>
          )}
          <Text
            strong
            style={{
              fontSize: touchMode ? 12 : 11,
              display: 'block',
              color: chrome.headerColor,
            }}
          >
            {column.periodLabel}
          </Text>
          {isCurrentAge && (
            <Text style={{ fontSize: 10, color: AIYRACARE_TOKENS.colorPrimary }}>hoje</Text>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 6px', minHeight: 36 }}>
          {column.catalogRows.map((row) => (
            <DoseChipPopover key={row.id} row={row} isExtra={false} touchMode={touchMode} />
          ))}
          {column.extraRows.map((row) => (
            <DoseChipPopover key={row.id} row={row} isExtra={true} touchMode={touchMode} />
          ))}
          {!hasSlots && (
            <div style={{ height: 24, marginTop: 2 }} />
          )}
        </div>
      </div>
    </div>
  )
}

export function VaccineScheduleCarousel({ timeline, birthDate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ active: boolean; startX: number; scrollLeft: number; pointerId: number } | null>(null)
  const { columns, childAgeMonths } = timeline
  const isMobile = useIsMobile()
  const touchMode = useCoarsePointer() || isMobile

  const [colWidth, setColWidth] = useState(116)
  const [fillsViewport, setFillsViewport] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [activeColIndex, setActiveColIndex] = useState(0)

  const minCol = isMobile ? MOBILE_MIN_COL : DESKTOP_MIN_COL
  const hasBirthDate = Boolean(birthDate)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < maxScroll - 4)

    const cols = el.querySelectorAll<HTMLElement>('.vaccine-timeline-col')
    const center = el.scrollLeft + el.clientWidth / 2
    let bestIdx = 0
    let bestDist = Infinity
    cols.forEach((col, i) => {
      const colCenter = col.offsetLeft + col.offsetWidth / 2
      const dist = Math.abs(colCenter - center)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    })
    setActiveColIndex(bestIdx)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateWidth = () => {
      const n = columns.length
      if (n === 0) return
      const available = el.clientWidth
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      if (!mobile && n * minCol <= available) {
        setFillsViewport(true)
        setColWidth(available / n)
      } else {
        setFillsViewport(false)
        setColWidth(mobile ? MOBILE_MIN_COL : DESKTOP_MIN_COL)
      }
    }

    updateWidth()
    const ro = new ResizeObserver(() => {
      updateWidth()
      updateScrollState()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [columns.length, minCol, updateScrollState])

  const scrollToColumn = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    const col = el.querySelectorAll<HTMLElement>('.vaccine-timeline-col')[index]
    if (!col) return
    const target =
      col.offsetLeft - (el.clientWidth - col.offsetWidth) / 2
    el.scrollTo({ left: Math.max(0, target), behavior })
  }, [])

  useEffect(() => {
    if (columns.length === 0 || fillsViewport) return
    const idx = columns.findIndex((c) => c.ageMonths >= childAgeMonths)
    const target = idx >= 0 ? idx : columns.length - 1
    requestAnimationFrame(() => scrollToColumn(target, 'auto'))
  }, [columns, childAgeMonths, fillsViewport, scrollToColumn])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    return () => el.removeEventListener('scroll', updateScrollState)
  }, [updateScrollState, columns.length, colWidth, fillsViewport])

  const scrollByStep = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(columns.length - 1, activeColIndex + direction))
    scrollToColumn(next)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (fillsViewport || e.button !== 0) return
    const el = scrollRef.current
    if (!el) return
    dragState.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      pointerId: e.pointerId,
    }
    el.setPointerCapture(e.pointerId)
    el.style.cursor = 'grabbing'
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current
    const el = scrollRef.current
    if (!state?.active || !el) return
    const dx = e.clientX - state.startX
    el.scrollLeft = state.scrollLeft - dx
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    const state = dragState.current
    if (!el || !state) return
    if (state.active) {
      el.releasePointerCapture(state.pointerId)
      el.style.cursor = 'grab'
      dragState.current = null
      updateScrollState()
    }
  }

  const trackWidth = fillsViewport ? undefined : columns.length * colWidth
  const showNav = !fillsViewport && columns.length > 1

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .vaccine-carousel-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
          <Title level={5} style={{ margin: 0 }}>Calendário vacinal</Title>
          {!isMobile && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              PNI · linha do tempo por idade
              {hasBirthDate ? ' · datas a partir do nascimento' : ''}
            </Text>
          )}
        </div>
        {showNav && isMobile && (
          <Text type="secondary" style={{ fontSize: 11 }}>Deslize para navegar</Text>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: isMobile ? 10 : 16,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        {(['applied', 'overdue', 'current', 'future'] as const).map((status) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: DOSE_STATUS_COLOR[status],
              }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {status === 'applied' && 'Aplicada'}
              {status === 'overdue' && 'Atrasada'}
              {status === 'current' && 'No período'}
              {status === 'future' && 'Futura'}
            </Text>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: '#f9f0ff',
              border: '1px dashed #9254de',
            }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>Fora do calendário</Text>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {showNav && canScrollLeft && (
          <Button
            type="default"
            shape="circle"
            size={isMobile ? 'middle' : 'small'}
            icon={<LeftOutlined />}
            aria-label="Período anterior"
            onClick={() => scrollByStep(-1)}
            style={{
              position: 'absolute',
              left: isMobile ? 2 : 4,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          />
        )}
        {showNav && canScrollRight && (
          <Button
            type="default"
            shape="circle"
            size={isMobile ? 'middle' : 'small'}
            icon={<RightOutlined />}
            aria-label="Próximo período"
            onClick={() => scrollByStep(1)}
            style={{
              position: 'absolute',
              right: isMobile ? 2 : 4,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          />
        )}

        <div
          ref={scrollRef}
          className="vaccine-carousel-scroll"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          style={{
            ...SCROLL_HIDE,
            width: '100%',
            overflowX: fillsViewport ? 'hidden' : 'auto',
            overflowY: 'hidden',
            scrollSnapType: fillsViewport ? undefined : 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            cursor: fillsViewport ? 'default' : 'grab',
            touchAction: 'pan-x',
            userSelect: 'none',
            padding: showNav ? (isMobile ? '4px 36px' : '4px 28px') : '4px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: trackWidth ?? '100%',
              minWidth: '100%',
              padding: '0 2px',
            }}
          >
            {columns.map((column) => (
              <TimelineColumn
                key={column.ageMonths}
                column={column}
                childAgeMonths={childAgeMonths}
                colWidth={colWidth}
                fillsViewport={fillsViewport}
                touchMode={touchMode}
                calendarRef={
                  birthDate ? formatCalendarMonthYear(birthDate, column.ageMonths) : null
                }
              />
            ))}
          </div>
        </div>

        {showNav && columns.length > 1 && (
          <div style={{ marginTop: 12, padding: '0 4px', textAlign: 'center' }}>
            {columns.length <= 24 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 5,
                  flexWrap: 'wrap',
                  marginBottom: 6,
                }}
              >
                {columns.map((col, i) => (
                  <button
                    key={col.ageMonths}
                    type="button"
                    aria-label={`Ir para ${col.periodLabel}`}
                    onClick={() => scrollToColumn(i)}
                    style={{
                      width: i === activeColIndex ? 18 : 7,
                      height: 7,
                      borderRadius: 4,
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      background:
                        i === activeColIndex
                          ? AIYRACARE_TOKENS.colorPrimary
                          : col.ageMonths === childAgeMonths
                            ? '#C4B5FD'
                            : '#E2E8F0',
                      transition: 'width 0.2s ease, background 0.2s ease',
                    }}
                  />
                ))}
              </div>
            )}
            <Text type="secondary" style={{ fontSize: 11 }}>
              {columns[activeColIndex]?.periodLabel}
              {columns[activeColIndex]?.ageMonths === childAgeMonths ? ' · hoje' : ''}
            </Text>
          </div>
        )}
      </div>
    </div>
  )
}

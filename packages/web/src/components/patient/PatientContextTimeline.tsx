import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Popover, Typography } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { PatientContext } from '../../lib/api.types.js'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'
import { timelineKindMeta } from './timeline-kind-meta.js'
import './patient-context-timeline.css'

const { Text } = Typography

type TimelineEvent = PatientContext['timeline'][number]

const COL_WIDTH = 148
const STACK_OFFSET = 12
const SCROLL_HIDE = { scrollbarWidth: 'none', msOverflowStyle: 'none' } as const

interface TimelineGroup {
  key: string
  date: string
  events: TimelineEvent[]
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupEventsByDay(events: TimelineEvent[]): TimelineGroup[] {
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const map = new Map<string, TimelineEvent[]>()

  for (const event of sorted) {
    const key = dayKey(event.date)
    const list = map.get(key) ?? []
    list.push(event)
    map.set(key, list)
  }

  return [...map.entries()].map(([key, groupEvents]) => ({
    key,
    date: groupEvents[0].date,
    events: groupEvents,
  }))
}

function EventPopoverContent({ event }: { event: TimelineEvent }) {
  const meta = timelineKindMeta(event.kind)

  return (
    <div style={{ maxWidth: 280 }}>
      <Text strong style={{ display: 'block', marginBottom: 4, color: meta.color }}>
        {meta.label}
      </Text>
      <Text style={{ display: 'block', fontSize: 13 }}>{event.title}</Text>
      {event.subtitle && (
        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
          {event.subtitle}
        </Text>
      )}
      <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 8 }}>
        {formatFullDate(event.date)} · {event.source}
      </Text>
    </div>
  )
}

function EventCard({ event }: { event: TimelineEvent }) {
  const meta = timelineKindMeta(event.kind)
  const { Icon } = meta

  return (
    <div
      className="patient-context-timeline__card"
      style={{
        background: meta.bg,
        borderColor: `${meta.color}33`,
      }}
    >
      <div className="patient-context-timeline__card-head">
        <span
          className="patient-context-timeline__icon"
          style={{ background: meta.color, color: '#fff' }}
        >
          <Icon style={{ fontSize: 11 }} />
        </span>
        <Text className="patient-context-timeline__kind" style={{ color: meta.color }}>
          {meta.label}
        </Text>
      </div>
      <Text className="patient-context-timeline__title" ellipsis={{ tooltip: event.title }}>
        {event.title}
      </Text>
      {event.subtitle && (
        <Text type="secondary" className="patient-context-timeline__subtitle" ellipsis>
          {event.subtitle}
        </Text>
      )}
    </div>
  )
}

function TimelineColumn({
  group,
  touchMode,
}: {
  group: TimelineGroup
  touchMode: boolean
}) {
  const count = group.events.length
  const primary = group.events[count - 1]
  const primaryMeta = timelineKindMeta(primary.kind)

  return (
    <div className="patient-context-timeline__node" style={{ width: COL_WIDTH }}>
      <div className="patient-context-timeline__node-inner">
        <div className="patient-context-timeline__connector">
          <div
            className="patient-context-timeline__cards-stack"
            style={{
              minHeight: 56 + (count - 1) * STACK_OFFSET,
            }}
          >
            {group.events.map((event, index) => {
              const offset = (count - 1 - index) * STACK_OFFSET
              return (
                <Popover
                  key={`${event.kind}-${event.date}-${event.entityId ?? index}`}
                  content={<EventPopoverContent event={event} />}
                  title={null}
                  trigger={touchMode ? 'click' : 'hover'}
                  placement="top"
                >
                  <div
                    className="patient-context-timeline__card-slot"
                    style={{
                      transform: `translateY(-${offset}px)`,
                      zIndex: index + 1,
                    }}
                  >
                    <EventCard event={event} />
                  </div>
                </Popover>
              )
            })}
          </div>
          <div
            className="patient-context-timeline__stem"
            style={{ background: primaryMeta.color }}
          />
        </div>

        <div className="patient-context-timeline__axis-fixed">
          <div className="patient-context-timeline__dot-row">
            <div
              className={`patient-context-timeline__dot${count > 1 ? ' patient-context-timeline__dot--badge' : ''}`}
              style={{
                background: primaryMeta.color,
                boxShadow: `0 0 0 3px ${primaryMeta.bg}, 0 0 0 4px ${primaryMeta.color}40`,
              }}
            >
              {count > 1 && (
                <span className="patient-context-timeline__dot-count">{count}</span>
              )}
            </div>
          </div>
          <div className="patient-context-timeline__date-row">
            <Text className="patient-context-timeline__date">{formatShortDate(group.date)}</Text>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PatientContextTimelineProps {
  events: TimelineEvent[]
  maxItems?: number
  showHeader?: boolean
}

export function PatientContextTimeline({ events, maxItems = 8, showHeader = true }: PatientContextTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const groups = useMemo(() => {
    const sliced = [...events]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-maxItems)
    return groupEventsByDay(sliced)
  }, [events, maxItems])

  const stackPadding = useMemo(() => {
    const maxStack = groups.reduce((max, g) => Math.max(max, g.events.length), 1)
    return (maxStack - 1) * STACK_OFFSET
  }, [groups])

  const updateScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = el.scrollWidth - el.clientWidth
    updateScroll()
    el.addEventListener('scroll', updateScroll, { passive: true })
    const ro = new ResizeObserver(updateScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScroll)
      ro.disconnect()
    }
  }, [updateScroll, groups.length])

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * COL_WIDTH * 2, behavior: 'smooth' })
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('.patient-context-timeline__nav-fab')) return

    const el = scrollRef.current
    if (!el) return

    dragRef.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false }
    el.setPointerCapture(e.pointerId)
    setIsDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    const el = scrollRef.current
    if (!el) return

    const dx = e.clientX - dragRef.current.startX
    if (Math.abs(dx) > 3) dragRef.current.moved = true
    el.scrollLeft = dragRef.current.startScroll - dx
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    setIsDragging(false)
    scrollRef.current?.releasePointerCapture(e.pointerId)
  }

  const touchMode = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  if (groups.length === 0) return null

  const showLeftCap = !canScrollLeft
  const showRightCap = !canScrollRight

  return (
    <div className="patient-context-timeline">
      {showHeader && (
        <div className="patient-context-timeline__header">
          <Text strong>Linha do tempo</Text>
        </div>
      )}

      <div className="patient-context-timeline__track-wrap">
        {canScrollLeft && (
          <div className="patient-context-timeline__edge patient-context-timeline__edge--left">
            <button
              type="button"
              className="patient-context-timeline__nav-fab"
              onClick={() => scrollBy(-1)}
              aria-label="Ver eventos anteriores"
            >
              <LeftOutlined />
            </button>
          </div>
        )}

        {canScrollRight && (
          <div className="patient-context-timeline__edge patient-context-timeline__edge--right">
            <button
              type="button"
              className="patient-context-timeline__nav-fab"
              onClick={() => scrollBy(1)}
              aria-label="Ver eventos posteriores"
            >
              <RightOutlined />
            </button>
          </div>
        )}

        {showLeftCap && (
          <div
            className="patient-context-timeline__rail-cap patient-context-timeline__rail-cap--left"
            aria-hidden
          />
        )}
        {showRightCap && (
          <div
            className="patient-context-timeline__rail-cap patient-context-timeline__rail-cap--right"
            aria-hidden
          />
        )}

        <div
          ref={scrollRef}
          className={`patient-context-timeline__scroll${isDragging ? ' patient-context-timeline__scroll--dragging' : ''}`}
          style={SCROLL_HIDE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            className="patient-context-timeline__rail"
            style={{
              minWidth: groups.length * COL_WIDTH,
              paddingTop: 8 + stackPadding,
              '--rail-gradient': `linear-gradient(90deg, ${AIYRACARE_TOKENS.colorPrimary} 0%, ${AIYRACARE_TOKENS.colorInfo} 100%)`,
            } as CSSProperties}
          >
            {groups.map((group) => (
              <TimelineColumn key={group.key} group={group} touchMode={touchMode} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

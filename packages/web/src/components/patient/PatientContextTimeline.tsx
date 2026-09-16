import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Popover, Typography } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { PatientContext, PatientTimelineEvent } from '../../lib/api.types.js'
import { FleuryLaboratoryCell } from '../brands/FleuryLaboratoryCell.js'
import { isFleuryPrecisionSource } from '../../lib/fleury-laboratory.js'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'
import { timelineKindMeta } from './timeline-kind-meta.js'
import './patient-context-timeline.css'

const { Text } = Typography

type TimelineEvent = PatientContext['timeline'][number]
type TimelineItem = NonNullable<TimelineEvent['items']>[number]

const COL_WIDTH = 148
const STACK_OFFSET = 12
const CARD_BODY_HEIGHT = 56
const CARD_STACK_OVERLAP = CARD_BODY_HEIGHT - STACK_OFFSET
const SCROLL_HIDE = { scrollbarWidth: 'none', msOverflowStyle: 'none' } as const

const AGENDA_KIND_ORDER = ['appointment', 'reminder', 'task'] as const

interface TimelineDayGroup {
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

function formatItemTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupEventsByDay(events: TimelineEvent[]): TimelineDayGroup[] {
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const map = new Map<string, TimelineEvent[]>()

  for (const event of sorted) {
    const key = dayKey(event.date)
    const list = map.get(key) ?? []
    list.push(event)
    map.set(key, list)
  }

  return [...map.entries()].map(([key, dayEvents]) => ({
    key,
    date: dayEvents.reduce(
      (max, e) => (new Date(e.date).getTime() > new Date(max).getTime() ? e.date : max),
      dayEvents[0].date,
    ),
    events: dayEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  }))
}

function isGroupedEvent(event: TimelineEvent): boolean {
  return (event.count ?? 0) > 1 || (event.items?.length ?? 0) > 1
}

function ExamItemsList({ items }: { items: TimelineItem[] }) {
  const { t } = useTranslation()
  const byOrder = new Map<string, TimelineItem[]>()
  const noOrder: TimelineItem[] = []

  for (const item of items) {
    if (item.examOrderId) {
      const list = byOrder.get(item.examOrderId) ?? []
      list.push(item)
      byOrder.set(item.examOrderId, list)
    } else {
      noOrder.push(item)
    }
  }

  return (
    <div className="patient-context-timeline__popover-items">
      {[...byOrder.entries()].map(([orderId, orderItems]) => (
        <div key={orderId} className="patient-context-timeline__popover-pedido">
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
            {t('timeline.pedidoGroup', { count: orderItems.length })}
          </Text>
          {orderItems.map((item, index) => (
            <div key={item.entityId ?? `${orderId}-${index}`} className="patient-context-timeline__popover-item">
              <Text style={{ fontSize: 12 }}>{item.title}</Text>
              {item.subtitle && isFleuryPrecisionSource(item.source) ? (
                <FleuryLaboratoryCell
                  source={item.source}
                  laboratory={item.subtitle}
                  showGroupSeal={false}
                />
              ) : item.subtitle ? (
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {item.subtitle}
                </Text>
              ) : null}
            </div>
          ))}
        </div>
      ))}
      {noOrder.map((item, index) => (
        <div key={item.entityId ?? `no-order-${index}`} className="patient-context-timeline__popover-item">
          <Text style={{ fontSize: 12 }}>{item.title}</Text>
          {item.subtitle && isFleuryPrecisionSource(item.source) ? (
            <FleuryLaboratoryCell
              source={item.source}
              laboratory={item.subtitle}
              showGroupSeal={false}
            />
          ) : item.subtitle ? (
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {item.subtitle}
            </Text>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function GroupPopoverContent({ event }: { event: TimelineEvent }) {
  const meta = timelineKindMeta(event.kind)
  const items = event.items ?? []

  return (
    <div style={{ maxWidth: 300 }}>
      <Text strong style={{ display: 'block', marginBottom: 6, color: meta.color }}>
        {meta.label}
        {event.count != null && event.count > 1 ? ` · ${event.count}` : ''}
      </Text>
      {event.kind === 'exam' ? (
        <ExamItemsList items={items} />
      ) : (
        <div className="patient-context-timeline__popover-items">
          {items.map((item, index) => (
            <div key={item.entityId ?? index} className="patient-context-timeline__popover-item">
              <Text style={{ fontSize: 12 }}>{item.title}</Text>
              {item.subtitle && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {item.subtitle}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: 10 }}>
                {formatItemTime(item.date)} · {item.source}
              </Text>
            </div>
          ))}
        </div>
      )}
      <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 8 }}>
        {formatFullDate(event.date)}
      </Text>
    </div>
  )
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
        isFleuryPrecisionSource(event.source) ? (
          <div style={{ marginTop: 4 }}>
            <FleuryLaboratoryCell
              source={event.source}
              laboratory={event.subtitle}
              showGroupSeal={false}
            />
          </div>
        ) : (
          <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
            {event.subtitle}
          </Text>
        )
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
  const grouped = isGroupedEvent(event)
  const displayTitle = grouped && event.count ? event.title : event.title

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
        <span className="patient-context-timeline__kind" style={{ color: meta.color }}>
          {meta.label}
          {grouped && event.count != null && event.count > 1 ? ` (${event.count})` : ''}
        </span>
      </div>
      <div className="patient-context-timeline__title" title={displayTitle}>
        {displayTitle}
      </div>
      {event.subtitle && (
        <div className="patient-context-timeline__subtitle" title={event.subtitle}>
          {event.subtitle}
        </div>
      )}
    </div>
  )
}

function TimelineColumn({
  group,
  touchMode,
}: {
  group: TimelineDayGroup
  touchMode: boolean
}) {
  const kindCount = group.events.length
  const primary = group.events[0]
  const primaryMeta = timelineKindMeta(primary.kind)

  return (
    <div className="patient-context-timeline__node" style={{ width: COL_WIDTH }}>
      <div className="patient-context-timeline__node-inner">
        <div className="patient-context-timeline__connector">
          <div className="patient-context-timeline__cards-stack">
            {group.events.map((event, index) => (
              <Popover
                key={`${event.kind}-${event.entityId ?? index}`}
                content={
                  isGroupedEvent(event)
                    ? <GroupPopoverContent event={event} />
                    : <EventPopoverContent event={event} />
                }
                title={null}
                trigger={touchMode ? 'click' : 'hover'}
                placement="top"
              >
                <div
                  className="patient-context-timeline__card-slot"
                  style={{
                    marginTop: index === 0 ? 0 : -CARD_STACK_OVERLAP,
                    zIndex: index + 1,
                  }}
                >
                  <EventCard event={event} />
                </div>
              </Popover>
            ))}
          </div>
          <div
            className="patient-context-timeline__stem"
            style={{ background: primaryMeta.color }}
          />
        </div>

        <div className="patient-context-timeline__axis-fixed">
          <div className="patient-context-timeline__dot-row">
            <div
              className={`patient-context-timeline__dot${kindCount > 1 ? ' patient-context-timeline__dot--badge' : ''}`}
              style={{
                background: primaryMeta.color,
                boxShadow: `0 0 0 3px ${primaryMeta.bg}, 0 0 0 4px ${primaryMeta.color}40`,
              }}
            >
              {kindCount > 1 && (
                <span className="patient-context-timeline__dot-count">{kindCount}</span>
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
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const groups = useMemo(() => {
    const dayGroups = groupEventsByDay(events)
    return dayGroups.slice(-maxItems)
  }, [events, maxItems])

  const stackPadding = useMemo(() => {
    const maxStack = groups.reduce((max, g) => Math.max(max, g.events.length), 1)
    return CARD_BODY_HEIGHT + (maxStack - 1) * STACK_OFFSET
  }, [groups])

  const scrollTopPadding = 10

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

  return (
    <div className="patient-context-timeline">
      {showHeader && (
        <div className="patient-context-timeline__header">
          <Text strong>{t('agenda.timelineTitle')}</Text>
        </div>
      )}

      <div className="patient-context-timeline__track-wrap">
        {canScrollLeft && (
          <div className="patient-context-timeline__edge patient-context-timeline__edge--left">
            <button
              type="button"
              className="patient-context-timeline__nav-fab"
              onClick={() => scrollBy(-1)}
              aria-label={t('agenda.timelinePrev')}
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
              aria-label={t('agenda.timelineNext')}
            >
              <RightOutlined />
            </button>
          </div>
        )}

        <div
          ref={scrollRef}
          className={`patient-context-timeline__scroll${isDragging ? ' patient-context-timeline__scroll--dragging' : ''}`}
          style={{
            ...SCROLL_HIDE,
            paddingTop: scrollTopPadding,
            minHeight: stackPadding + scrollTopPadding + 48,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            className="patient-context-timeline__rail"
            style={{
              minWidth: groups.length * COL_WIDTH,
              minHeight: stackPadding + 48,
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

/** Group scheduled agenda events by kind for a single calendar day. */
export function groupAgendaEventsByKind<T extends { kind: string }>(events: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const event of events) {
    const list = map.get(event.kind) ?? []
    list.push(event)
    map.set(event.kind, list)
  }
  return map
}

export const AGENDA_KIND_DISPLAY_ORDER = AGENDA_KIND_ORDER

/** Day buckets for timeline list view (API events are already grouped by kind per day). */
export function groupTimelineEventsByDay(events: PatientTimelineEvent[]): TimelineDayGroup[] {
  return groupEventsByDay(events as TimelineEvent[])
}

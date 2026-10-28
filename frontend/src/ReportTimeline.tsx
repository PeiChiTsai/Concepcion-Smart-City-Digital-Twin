import { useEffect, useMemo, useState } from 'react'
import { useI18n } from './i18n'

export type TimeRange = { start: number; end: number }

const HOUR = 3_600_000
const DAY = 24 * HOUR
const BUCKETS = 48

// Prefer when the event happened; fall back to when it was reported.
export function getReportTimestamp(report: any): number | null {
  for (const value of [report.event_time, report.report_time, report.time]) {
    if (!value) continue
    const timestamp = new Date(String(value)).getTime()
    if (!Number.isNaN(timestamp)) return timestamp
  }
  return null
}

export function isInTimeRange(timestamp: number | null, range: TimeRange | null) {
  if (!range) return true
  return timestamp !== null && timestamp >= range.start && timestamp <= range.end
}

type ReportTimelineProps = {
  reports: any[]
  left: number
  onRangeChange: (range: TimeRange | null) => void
}

export default function ReportTimeline({ reports, left, onRangeChange }: ReportTimelineProps) {
  const { t } = useI18n()
  const timestamps = useMemo(
    () => reports.map(getReportTimestamp).filter((value): value is number => value !== null),
    [reports],
  )

  const domain = useMemo(() => {
    if (!timestamps.length) return null
    let min = Infinity
    let max = -Infinity
    timestamps.forEach((value) => {
      if (value < min) min = value
      if (value > max) max = value
    })
    min = Math.floor(min / HOUR) * HOUR
    max = Math.ceil(max / HOUR) * HOUR
    return max - min < DAY ? { start: min, end: min + DAY } : { start: min, end: max }
  }, [timestamps])

  const [range, setRange] = useState<TimeRange | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setRange(null)
  }, [domain?.start, domain?.end])

  useEffect(() => {
    onRangeChange(range)
  }, [range, onRangeChange])

  const buckets = useMemo(() => {
    if (!domain) return []
    const size = (domain.end - domain.start) / BUCKETS
    const counts = new Array<number>(BUCKETS).fill(0)
    timestamps.forEach((timestamp) => {
      const index = Math.min(BUCKETS - 1, Math.floor((timestamp - domain.start) / size))
      counts[index] += 1
    })
    return counts
  }, [domain, timestamps])

  if (!domain) return null

  const active = range ?? domain
  const maxCount = Math.max(1, ...buckets)
  const percent = (value: number) => ((value - domain.start) / (domain.end - domain.start)) * 100
  const inRangeCount = timestamps.filter((value) => value >= active.start && value <= active.end).length
  const format = (value: number) => new Date(value).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const setStart = (value: number) => setRange({ start: Math.min(value, active.end), end: active.end })
  const setEnd = (value: number) => setRange({ start: active.start, end: Math.max(value, active.start) })
  const setLast = (duration: number) => setRange({
    start: Math.max(domain.start, domain.end - duration),
    end: domain.end,
  })

  return (
    <section
      className={`report-timeline${collapsed ? ' is-collapsed' : ''}`}
      style={{ left }}
      aria-label={t('Report timeline')}
    >
      <div className="report-timeline-header">
        <span className="report-layer-eyebrow">{t('TIMELINE')}</span>
        <span className="report-timeline-range">
          {format(active.start)} – {format(active.end)} · {inRangeCount} {t('reports')}
        </span>
        {!collapsed && (
          <div className="report-timeline-presets">
            <button onClick={() => setLast(DAY)} type="button">{t('Last 24 h')}</button>
            <button onClick={() => setLast(7 * DAY)} type="button">{t('Last 7 days')}</button>
            <button onClick={() => setRange(null)} type="button">{t('All')}</button>
          </div>
        )}
        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('Expand timeline') : t('Collapse timeline')}
          className="report-timeline-toggle"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          {collapsed ? '▴' : '▾'}
        </button>
      </div>
      {!collapsed && <>
      <div className="report-timeline-track">
        <div className="report-timeline-bars" aria-hidden="true">
          {buckets.map((count, index) => {
            const bucketStart = domain.start + (index * (domain.end - domain.start)) / BUCKETS
            const selected = bucketStart >= active.start - 1 && bucketStart <= active.end
            return (
              <span
                className={selected ? 'is-selected' : undefined}
                key={index}
                style={{ height: `${count ? 12 + (count / maxCount) * 88 : 4}%` }}
              />
            )
          })}
        </div>
        <div
          className="report-timeline-selection"
          style={{ left: `${percent(active.start)}%`, right: `${100 - percent(active.end)}%` }}
        />
        <input
          aria-label={t('Timeline start')}
          max={domain.end}
          min={domain.start}
          onChange={(event) => setStart(Number(event.target.value))}
          step={HOUR}
          type="range"
          value={active.start}
        />
        <input
          aria-label={t('Timeline end')}
          max={domain.end}
          min={domain.start}
          onChange={(event) => setEnd(Number(event.target.value))}
          step={HOUR}
          type="range"
          value={active.end}
        />
      </div>
      <div className="report-timeline-axis">
        <span>{format(domain.start)}</span>
        <span>{format(domain.end)}</span>
      </div>
      </>}
    </section>
  )
}

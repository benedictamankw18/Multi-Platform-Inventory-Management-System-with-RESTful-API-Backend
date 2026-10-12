import { useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import type { SalesTrendGranularity, SalesTrendPoint } from '../services/api'

export type TrendMetric = 'revenue' | 'profit' | 'orders'

interface SalesTrendChartProps {
  points: SalesTrendPoint[]
  granularity: SalesTrendGranularity
  metric: TrendMetric
  currency: string
  formatCurrency: (value: number | string | null | undefined) => string
  loading?: boolean
}

const HEIGHT = 260
const PAD = { top: 18, right: 16, bottom: 30, left: 72 }

function compact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return `${Math.round(value)}`
}

function metricValue(point: SalesTrendPoint, metric: TrendMetric): number {
  if (metric === 'orders') return point.orders
  if (metric === 'profit') return point.profit
  return point.revenue
}

function bucketLabel(bucket: string, granularity: SalesTrendGranularity): string {
  const d = new Date(`${bucket}T00:00:00`)
  if (granularity === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function SalesTrendChart({
  points,
  granularity,
  metric,
  currency,
  formatCurrency,
  loading = false,
}: SalesTrendChartProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(760)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setWidth(Math.max(el.clientWidth, 320))
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (loading) {
    return (
      <div className="trend-chart" ref={wrapRef}>
        <div className="skeleton skeleton--row" style={{ height: 200 }} />
      </div>
    )
  }

  if (!points.length) {
    return (
      <div className="trend-chart" ref={wrapRef}>
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18" /><path d="M7 16l4-5 4 3 5-7" /></svg>
          <p>No sales data for this period yet.</p>
        </div>
      </div>
    )
  }

  const innerW = Math.max(width - PAD.left - PAD.right, 10)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const n = points.length
  const rawMax = Math.max(...points.map((p) => metricValue(p, metric)), 0)
  const max = rawMax > 0 ? rawMax * 1.1 : 1
  const x = (i: number) => (n > 1 ? PAD.left + (i / (n - 1)) * innerW : PAD.left + innerW / 2)
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH

  const isBar = metric === 'orders'
  const stroke = metric === 'profit' ? '#10b981' : '#2563EB'
  const fill = metric === 'profit' ? 'rgba(16,185,129,0.16)' : 'rgba(37,99,235,0.16)'

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(metricValue(p, metric)).toFixed(1)}`)
    .join(' ')
  const area = `${line} L ${x(n - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`

  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const labelStep = Math.max(1, Math.ceil(n / 7))
  const hp = hover != null ? points[hover] : null
  const tooltipLeft = hover != null ? Math.min(Math.max(x(hover), 84), Math.max(width - 84, 84)) : 0

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left - PAD.left) / (innerW || 1)
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))))
  }

  return (
    <div className="trend-chart" ref={wrapRef}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${metric} trend`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => {
          const yy = PAD.top + innerH - t * innerH
          return (
            <g key={t}>
              <line className="trend-grid" x1={PAD.left} x2={width - PAD.right} y1={yy} y2={yy} />
              <text className="trend-axis-label" x={PAD.left - 10} y={yy + 4} textAnchor="end">
                {metric === 'orders' ? compact(max * t) : `${currency} ${compact(max * t)}`}
              </text>
            </g>
          )
        })}

        {isBar
          ? points.map((p, i) => {
              const barW = Math.max(2, (innerW / n) * 0.55)
              const top = y(metricValue(p, metric))
              return (
                <rect
                  key={p.bucket}
                  className={hover === i ? 'trend-bar trend-bar--active' : 'trend-bar'}
                  x={x(i) - barW / 2}
                  y={top}
                  width={barW}
                  height={Math.max(PAD.top + innerH - top, 0)}
                  rx={3}
                  fill={stroke}
                />
              )
            })
          : (
            <>
              <path d={area} fill={fill} />
              <path d={line} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {points.map((p, i) => (
                <circle
                  key={p.bucket}
                  cx={x(i)}
                  cy={y(metricValue(p, metric))}
                  r={hover === i ? 5 : 3}
                  fill={stroke}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              ))}
            </>
          )}

        {hover != null && (
          <line className="trend-guide" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} />
        )}

        {points.map((p, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text key={`l-${p.bucket}`} className="trend-axis-label" x={x(i)} y={HEIGHT - 10} textAnchor="middle">
              {bucketLabel(p.bucket, granularity)}
            </text>
          ) : null,
        )}
      </svg>

      {hp && (
        <div className="trend-tooltip" style={{ left: tooltipLeft }}>
          <strong>{bucketLabel(hp.bucket, granularity)}</strong>
          <span><i className="trend-dot" style={{ background: stroke }} />{formatCurrency(hp.revenue)} revenue</span>
          <span><i className="trend-dot" style={{ background: '#10b981' }} />{formatCurrency(hp.profit)} profit</span>
          <span><i className="trend-dot" style={{ background: '#94a3b8' }} />{hp.orders} order{hp.orders === 1 ? '' : 's'}</span>
        </div>
      )}
    </div>
  )
}

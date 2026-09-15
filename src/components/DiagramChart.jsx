import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '../engine/units.js'

function chartData(points, invert = false) {
  return points.map((p, i) => {
    const raw = invert ? -p.value : p.value
    return {
      i,
      x: Number(p.x.toFixed(6)),
      value: raw,
      pos: Math.max(raw, 0),
      neg: Math.min(raw, 0),
    }
  })
}

function CriticalTooltip({ active, payload, unit, xUnit }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="chart-tip">
      <div>
        x = {formatNumber(row.x, 3)} {xUnit}
      </div>
      <div>
        {formatNumber(row.value, 3)} {unit}
      </div>
    </div>
  )
}

export default function DiagramChart({
  title,
  points,
  length,
  unit,
  xUnit,
  color,
  fillPos,
  fillNeg,
  invert = false,
  markers = [],
}) {
  const data = chartData(points, invert)
  const marks = markers.map((m) => ({
    x: Number(m.x.toFixed(6)),
    value: invert ? -m.value : m.value,
    label: m.label,
  }))

  return (
    <section className="diagram-card">
      <div className="card-head">
        <h2>{title}</h2>
        {invert ? <span className="chip">Plotted on tension side</span> : null}
      </div>
      <div className="chart-wrap">
        {data.length === 0 ? (
          <p className="empty">No diagram to display.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data} margin={{ top: 18, right: 18, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#243049" strokeDasharray="3 4" />
              <XAxis
                dataKey="x"
                type="number"
                domain={[0, Math.max(length || 1, 0.01)]}
                tickFormatter={(v) => formatNumber(v, 2)}
                stroke="#8b9bb4"
              />
              <YAxis
                tickFormatter={(v) => formatNumber(v, 2)}
                stroke="#8b9bb4"
                width={58}
              />
              <Tooltip content={<CriticalTooltip unit={unit} xUnit={xUnit} />} />
              <ReferenceLine y={0} stroke="#9aabc4" strokeWidth={1.2} />
              <Area
                type="linear"
                dataKey="pos"
                stroke="none"
                fill={fillPos}
                isAnimationActive={false}
                connectNulls
              />
              <Area
                type="linear"
                dataKey="neg"
                stroke="none"
                fill={fillNeg}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="linear"
                dataKey="value"
                stroke={color}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
              {marks.length > 0 ? (
                <Scatter data={marks} dataKey="value" fill={color} line={false} />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {markers.length > 0 ? (
        <div className="marker-legend">
          {markers.map((m) => (
            <span key={`${m.label}-${m.x}`}>
              {m.label}: {formatNumber(m.value, 3)} {unit} at {formatNumber(m.x, 3)} {xUnit}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}

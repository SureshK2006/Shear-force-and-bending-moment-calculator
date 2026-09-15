import { SUPPORT_TYPES } from '../engine/constants.js'
import { formatNumber } from '../engine/units.js'

function xScale(x, L, left, width) {
  if (!L) return left
  return left + (x / L) * width
}

function Arrow({ x, y1, y2, color, head = 7 }) {
  const down = y2 > y1
  const hx = x
  const hy = y2
  const dir = down ? 1 : -1
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="1.8" />
      <polygon
        points={`${hx},${hy} ${hx - 4.5},${hy - dir * head} ${hx + 4.5},${hy - dir * head}`}
        fill={color}
      />
    </g>
  )
}

function MomentArc({ x, y, clockwise, color, label }) {
  const sweep = clockwise ? 1 : 0
  const d = `M ${x - 16} ${y - 12} A 16 16 0 1 ${sweep} ${x + 16} ${y - 12}`
  const tipX = clockwise ? x + 16 : x - 16
  const sign = clockwise ? 1 : -1
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" />
      <polygon
        points={`${tipX},${y - 12} ${tipX - sign * 8},${y - 18} ${tipX - sign * 2},${y - 6}`}
        fill={color}
      />
      <text x={x} y={y - 28} textAnchor="middle" className="svg-label" fill={color}>
        {label}
      </text>
    </g>
  )
}

function PinSupport({ x, y, roller }) {
  const size = 14
  return (
    <g>
      <polygon
        points={`${x},${y} ${x - size},${y + size} ${x + size},${y + size}`}
        fill="#1b2438"
        stroke="#8eb4ff"
        strokeWidth="1.4"
      />
      {roller ? (
        <>
          <circle cx={x - 6} cy={y + size + 5} r="4" fill="none" stroke="#8eb4ff" strokeWidth="1.4" />
          <circle cx={x + 6} cy={y + size + 5} r="4" fill="none" stroke="#8eb4ff" strokeWidth="1.4" />
        </>
      ) : (
        <line x1={x - 16} y1={y + size} x2={x + 16} y2={y + size} stroke="#8eb4ff" strokeWidth="1.4" />
      )}
    </g>
  )
}

function FixedSupport({ x, y, side }) {
  const dir = side === 'left' ? -1 : 1
  const hatch = []
  for (let i = 0; i < 7; i += 1) {
    const yy = y - 28 + i * 9
    hatch.push(
      <line
        key={i}
        x1={x + dir * 2}
        y1={yy}
        x2={x + dir * 12}
        y2={yy + 8}
        stroke="#8eb4ff"
        strokeWidth="1.3"
      />,
    )
  }
  return (
    <g>
      <line x1={x} y1={y - 32} x2={x} y2={y + 32} stroke="#8eb4ff" strokeWidth="3" />
      {hatch}
    </g>
  )
}

export default function BeamDiagram({ model, result, units }) {
  const L = Number(model.length)
  const width = 760
  const height = 300
  const left = 56
  const right = 36
  const usable = width - left - right
  const beamY = 150
  const sx = (x) => xScale(Number(x) || 0, L || 1, left, usable)

  const magnitudes = [
    ...model.pointLoads.map((p) => Math.abs(Number(p.magnitude) || 0)),
    ...model.udls.map((u) => Math.abs(Number(u.magnitude) || 0)),
    ...(result.reactions || []).filter((r) => r.kind === 'force').map((r) => Math.abs(r.value)),
  ]
  const maxLoad = Math.max(1, ...magnitudes)
  const arrowLen = (mag) => 28 + (Math.abs(mag) / maxLoad) * 52

  return (
    <section className="diagram-card">
      <div className="card-head">
        <h2>Beam loading diagram</h2>
        <span className="chip">Length {formatNumber(model.length)} {units.length}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="beam-svg" role="img" aria-label="Beam loading diagram">
        <line x1={left} y1={beamY} x2={left + usable} y2={beamY} stroke="#d7e3ff" strokeWidth="10" strokeLinecap="round" />
        <line x1={left} y1={beamY} x2={left + usable} y2={beamY} stroke="#3d4f73" strokeWidth="2" />

        {model.udls.map((u, i) => {
          const a = sx(u.start)
          const b = sx(u.end)
          const w = Number(u.magnitude) || 0
          const down = w >= 0
          const y0 = beamY
          const y1 = down ? beamY - arrowLen(w) : beamY + arrowLen(w)
          const count = Math.max(3, Math.round((b - a) / 22))
          const arrows = []
          for (let k = 0; k <= count; k += 1) {
            const x = a + ((b - a) * k) / count
            arrows.push(<Arrow key={`${u.id}-${k}`} x={x} y1={y1} y2={y0} color="#f07178" />)
          }
          return (
            <g key={u.id}>
              <rect
                x={Math.min(a, b)}
                y={Math.min(y0, y1)}
                width={Math.abs(b - a)}
                height={Math.abs(y1 - y0)}
                fill="rgba(240,113,120,0.12)"
              />
              {arrows}
              <text x={(a + b) / 2} y={y1 + (down ? -8 : 16)} textAnchor="middle" className="svg-label" fill="#f07178">
                {`UDL${i + 1} ${formatNumber(w)} ${units.udl}`}
              </text>
            </g>
          )
        })}

        {model.pointLoads.map((p, i) => {
          const x = sx(p.position)
          const mag = Number(p.magnitude) || 0
          const down = mag >= 0
          const y1 = down ? beamY - arrowLen(mag) : beamY + arrowLen(mag)
          return (
            <g key={p.id}>
              <Arrow x={x} y1={y1} y2={beamY} color="#ff8b6b" />
              <text x={x} y={y1 + (down ? -8 : 16)} textAnchor="middle" className="svg-label" fill="#ff8b6b">
                {`P${i + 1} ${formatNumber(mag)} ${units.force}`}
              </text>
            </g>
          )
        })}

        {model.pointMoments.map((m, i) => (
          <MomentArc
            key={m.id}
            x={sx(m.position)}
            y={beamY}
            clockwise={Number(m.magnitude) >= 0}
            color="#e0b84d"
            label={`M${i + 1} ${formatNumber(m.magnitude)} ${units.moment}`}
          />
        ))}

        {result.ok &&
          result.reactions
            .filter((r) => r.kind === 'force')
            .map((r) => {
              const up = r.value >= 0
              const y1 = up ? beamY + arrowLen(r.value) : beamY - arrowLen(r.value)
              return (
                <g key={r.id}>
                  <Arrow x={sx(r.position)} y1={y1} y2={beamY} color="#5ee0b5" />
                  <text x={sx(r.position)} y={y1 + (up ? 16 : -8)} textAnchor="middle" className="svg-label" fill="#5ee0b5">
                    {`${r.label.replace('_', '')} ${formatNumber(r.value)} ${units.force}`}
                  </text>
                </g>
              )
            })}

        {result.ok &&
          result.reactions
            .filter((r) => r.kind === 'moment')
            .map((r) => (
              <MomentArc
                key={r.id}
                x={sx(r.position)}
                y={beamY}
                clockwise={r.value >= 0}
                color="#7fd0ff"
                label={`${r.label.replace('_', '')} ${formatNumber(r.value)} ${units.moment}`}
              />
            ))}

        {model.supportType === SUPPORT_TYPES.SIMPLY_SUPPORTED && (
          <>
            <PinSupport x={sx(model.supportA)} y={beamY + 5} roller={false} />
            <PinSupport x={sx(model.supportB)} y={beamY + 5} roller />
            <text x={sx(model.supportA)} y={beamY + 48} textAnchor="middle" className="svg-label muted">
              A
            </text>
            <text x={sx(model.supportB)} y={beamY + 48} textAnchor="middle" className="svg-label muted">
              B
            </text>
          </>
        )}
        {model.supportType === SUPPORT_TYPES.CANTILEVER_LEFT && (
          <>
            <FixedSupport x={left} y={beamY} side="left" />
            <text x={left} y={beamY + 48} textAnchor="middle" className="svg-label muted">
              A (fixed)
            </text>
          </>
        )}
        {model.supportType === SUPPORT_TYPES.CANTILEVER_RIGHT && (
          <>
            <FixedSupport x={left + usable} y={beamY} side="right" />
            <text x={left + usable} y={beamY + 48} textAnchor="middle" className="svg-label muted">
              B (fixed)
            </text>
          </>
        )}
        {model.supportType === SUPPORT_TYPES.PROPPED_CANTILEVER && (
          <>
            <FixedSupport x={left} y={beamY} side="left" />
            <PinSupport x={sx(L)} y={beamY + 5} roller />
            <text x={left} y={beamY + 48} textAnchor="middle" className="svg-label muted">
              A (fixed)
            </text>
            <text x={sx(L)} y={beamY + 48} textAnchor="middle" className="svg-label muted">
              B (prop)
            </text>
          </>
        )}

        <line x1={left} y1={beamY + 72} x2={left + usable} y2={beamY + 72} stroke="#4b5d7e" />
        <polygon points={`${left},${beamY + 72} ${left + 6},${beamY + 68} ${left + 6},${beamY + 76}`} fill="#4b5d7e" />
        <polygon
          points={`${left + usable},${beamY + 72} ${left + usable - 6},${beamY + 68} ${left + usable - 6},${beamY + 76}`}
          fill="#4b5d7e"
        />
        <text x={left + usable / 2} y={beamY + 88} textAnchor="middle" className="svg-label muted">
          {`${formatNumber(model.length)} ${units.length}`}
        </text>
      </svg>
    </section>
  )
}

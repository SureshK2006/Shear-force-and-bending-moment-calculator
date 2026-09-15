import { formatNumber, formatSigned } from '../engine/units.js'

function StatCard({ label, value, unit, hint }) {
  return (
    <article className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">
        {formatSigned(value)} <small>{unit}</small>
      </p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  )
}

export default function ResultsPanel({ result, units }) {
  if (!result.ok) {
    return (
      <section className="diagram-card">
        <h2>Results</h2>
        <p className="empty">Fix the highlighted inputs to compute reactions, shear and moment.</p>
      </section>
    )
  }

  const { summary, reactions, stationValues, zeroShear, contraflexure } = result

  return (
    <>
      <section className="stats-grid">
        {reactions.map((r) => (
          <StatCard
            key={r.id}
            label={r.kind === 'force' ? `Reaction ${r.label.replace('_', '')}` : `Support moment ${r.label.replace('_', '')}`}
            value={r.value}
            unit={r.kind === 'force' ? units.force : units.moment}
            hint={`${r.kind === 'force' ? (r.value >= 0 ? 'Upward' : 'Downward') : r.value >= 0 ? 'Sagging / clockwise from left' : 'Hogging'} at x = ${formatNumber(r.position)} ${units.length}`}
          />
        ))}
        <StatCard
          label="Max + shear"
          value={summary.maxShear}
          unit={units.force}
          hint={`at x = ${formatNumber(summary.maxShearX)} ${units.length}`}
        />
        <StatCard
          label="Max − shear"
          value={summary.minShear}
          unit={units.force}
          hint={`at x = ${formatNumber(summary.minShearX)} ${units.length}`}
        />
        <StatCard
          label="Max sagging BM"
          value={summary.maxMoment}
          unit={units.moment}
          hint={`at x = ${formatNumber(summary.maxMomentX)} ${units.length}`}
        />
        <StatCard
          label="Max hogging BM"
          value={summary.minMoment}
          unit={units.moment}
          hint={`at x = ${formatNumber(summary.minMomentX)} ${units.length}`}
        />
      </section>

      <section className="diagram-card">
        <h2>Critical locations</h2>
        <div className="split-lists">
          <div>
            <h3>Zero shear</h3>
            {zeroShear.length === 0 ? (
              <p className="empty">No interior zero-shear points.</p>
            ) : (
              <ul>
                {zeroShear.map((z) => (
                  <li key={`v-${z.x}`}>
                    x = {formatNumber(z.x)} {units.length}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3>Points of contraflexure (M = 0)</h3>
            {contraflexure.length === 0 ? (
              <p className="empty">No interior points of contraflexure.</p>
            ) : (
              <ul>
                {contraflexure.map((z) => (
                  <li key={`m-${z.x}`}>
                    x = {formatNumber(z.x)} {units.length}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="diagram-card table-card">
        <h2>Station values</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>x ({units.length})</th>
                <th>Location</th>
                <th>V⁻ ({units.force})</th>
                <th>V⁺ ({units.force})</th>
                <th>M⁻ ({units.moment})</th>
                <th>M⁺ ({units.moment})</th>
              </tr>
            </thead>
            <tbody>
              {stationValues.map((row) => (
                <tr key={row.x}>
                  <td>{formatNumber(row.x)}</td>
                  <td>{row.label || '—'}</td>
                  <td>{formatNumber(row.shearLeft)}</td>
                  <td>{formatNumber(row.shearRight)}</td>
                  <td>{formatNumber(row.momentLeft)}</td>
                  <td>{formatNumber(row.momentRight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

import { SUPPORT_LABELS, SUPPORT_TYPES, uid } from '../engine/constants.js'
import { EXAMPLES } from '../engine/examples.js'
import { UNIT_META } from '../engine/units.js'

function NumberField({ label, value, onChange, suffix, step = 'any', min }) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-control">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)}
        />
        {suffix ? <em>{suffix}</em> : null}
      </span>
    </label>
  )
}

export default function InputPanel({
  model,
  setModel,
  units,
  errors,
  warnings,
  onExample,
}) {
  const u = UNIT_META[units]

  const patch = (partial) => setModel((prev) => ({ ...prev, ...partial }))

  const setLength = (value) => {
    setModel((prev) => {
      const next = { ...prev, length: value }
      const L = Number(value)
      const prevL = Number(prev.length)
      if (Number.isFinite(L) && L > 0) {
        if (prev.supportType === SUPPORT_TYPES.SIMPLY_SUPPORTED) {
          const a = Number(prev.supportA)
          const b = Number(prev.supportB)
          if (!Number.isFinite(a) || a === 0) next.supportA = 0
          if (!Number.isFinite(b) || Math.abs(b - prevL) < 1e-9 || b > L) next.supportB = L
        } else {
          next.supportB = L
        }
      }
      return next
    })
  }

  const setSupportType = (supportType) => {
    setModel((prev) => {
      const L = Number(prev.length) || 0
      const next = { ...prev, supportType }
      if (supportType === SUPPORT_TYPES.SIMPLY_SUPPORTED) {
        next.supportA = 0
        next.supportB = L
      } else if (supportType === SUPPORT_TYPES.CANTILEVER_RIGHT) {
        next.supportA = L
        next.supportB = L
      } else {
        next.supportA = 0
        next.supportB = L
      }
      return next
    })
  }

  const updateList = (key, id, partial) => {
    setModel((prev) => ({
      ...prev,
      [key]: prev[key].map((item) => (item.id === id ? { ...item, ...partial } : item)),
    }))
  }

  const removeList = (key, id) => {
    setModel((prev) => ({ ...prev, [key]: prev[key].filter((item) => item.id !== id) }))
  }

  const addPointLoad = () => {
    const L = Number(model.length)
    patch({
      pointLoads: [
        ...model.pointLoads,
        { id: uid('p'), magnitude: 10, position: Number.isFinite(L) ? L / 2 : 0 },
      ],
    })
  }

  const addUdl = () => {
    const L = Number(model.length)
    patch({
      udls: [
        ...model.udls,
        { id: uid('u'), magnitude: 5, start: 0, end: Number.isFinite(L) ? L : 1 },
      ],
    })
  }

  const addMoment = () => {
    const L = Number(model.length)
    patch({
      pointMoments: [
        ...model.pointMoments,
        { id: uid('m'), magnitude: 10, position: Number.isFinite(L) ? L / 2 : 0 },
      ],
    })
  }

  const showSupports = model.supportType === SUPPORT_TYPES.SIMPLY_SUPPORTED

  return (
    <aside className="input-panel">
      <section className="panel-card">
        <h2>Beam setup</h2>
        <NumberField
          label="Length L"
          value={model.length}
          onChange={setLength}
          suffix={u.length}
          min="0"
        />
        <label className="field">
          <span>Support type</span>
          <select value={model.supportType} onChange={(e) => setSupportType(e.target.value)}>
            {Object.entries(SUPPORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {showSupports ? (
          <div className="field-row">
            <NumberField
              label="Support A"
              value={model.supportA}
              onChange={(v) => patch({ supportA: v })}
              suffix={u.length}
              min="0"
            />
            <NumberField
              label="Support B"
              value={model.supportB}
              onChange={(v) => patch({ supportB: v })}
              suffix={u.length}
              min="0"
            />
          </div>
        ) : (
          <p className="hint">
            {model.supportType === SUPPORT_TYPES.CANTILEVER_LEFT &&
              'Fixed at x = 0, free at x = L.'}
            {model.supportType === SUPPORT_TYPES.CANTILEVER_RIGHT &&
              'Free at x = 0, fixed at x = L.'}
            {model.supportType === SUPPORT_TYPES.PROPPED_CANTILEVER &&
              'Fixed at x = 0, vertical prop at x = L.'}
          </p>
        )}
      </section>

      <section className="panel-card">
        <div className="card-head">
          <h2>Point loads</h2>
          <button type="button" className="btn tiny" onClick={addPointLoad}>
            Add
          </button>
        </div>
        <p className="hint">Positive magnitude acts downward.</p>
        {model.pointLoads.length === 0 ? <p className="empty">No point loads.</p> : null}
        {model.pointLoads.map((load, i) => (
          <div className="load-row" key={load.id}>
            <span className="badge">P{i + 1}</span>
            <NumberField
              label={`P (${u.force})`}
              value={load.magnitude}
              onChange={(v) => updateList('pointLoads', load.id, { magnitude: v })}
            />
            <NumberField
              label={`x (${u.length})`}
              value={load.position}
              onChange={(v) => updateList('pointLoads', load.id, { position: v })}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove point load ${i + 1}`}
              onClick={() => removeList('pointLoads', load.id)}
            >
              ×
            </button>
          </div>
        ))}
      </section>

      <section className="panel-card">
        <div className="card-head">
          <h2>Uniformly distributed loads</h2>
          <button type="button" className="btn tiny" onClick={addUdl}>
            Add
          </button>
        </div>
        <p className="hint">Positive intensity acts downward.</p>
        {model.udls.length === 0 ? <p className="empty">No UDLs.</p> : null}
        {model.udls.map((load, i) => (
          <div className="load-row stacked" key={load.id}>
            <div className="load-row-top">
              <span className="badge">UDL{i + 1}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove UDL ${i + 1}`}
                onClick={() => removeList('udls', load.id)}
              >
                ×
              </button>
            </div>
            <div className="field-row">
              <NumberField
                label={`w (${u.udl})`}
                value={load.magnitude}
                onChange={(v) => updateList('udls', load.id, { magnitude: v })}
              />
              <NumberField
                label={`Start (${u.length})`}
                value={load.start}
                onChange={(v) => updateList('udls', load.id, { start: v })}
              />
              <NumberField
                label={`End (${u.length})`}
                value={load.end}
                onChange={(v) => updateList('udls', load.id, { end: v })}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="panel-card">
        <div className="card-head">
          <h2>Point moments</h2>
          <button type="button" className="btn tiny" onClick={addMoment}>
            Add
          </button>
        </div>
        <p className="hint">Positive moment is clockwise.</p>
        {model.pointMoments.length === 0 ? <p className="empty">No applied moments.</p> : null}
        {model.pointMoments.map((load, i) => (
          <div className="load-row" key={load.id}>
            <span className="badge">M{i + 1}</span>
            <NumberField
              label={`M (${u.moment})`}
              value={load.magnitude}
              onChange={(v) => updateList('pointMoments', load.id, { magnitude: v })}
            />
            <NumberField
              label={`x (${u.length})`}
              value={load.position}
              onChange={(v) => updateList('pointMoments', load.id, { position: v })}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove moment ${i + 1}`}
              onClick={() => removeList('pointMoments', load.id)}
            >
              ×
            </button>
          </div>
        ))}
      </section>

      <section className="panel-card">
        <h2>Textbook examples</h2>
        <div className="example-list">
          {EXAMPLES.map((ex) => (
            <button key={ex.id} type="button" className="example-btn" onClick={() => onExample(ex)}>
              <strong>{ex.name}</strong>
              <span>{ex.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      {errors.length > 0 ? (
        <div className="banner error" role="alert">
          {errors.map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div className="banner warn">
          {warnings.map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </div>
      ) : null}
    </aside>
  )
}

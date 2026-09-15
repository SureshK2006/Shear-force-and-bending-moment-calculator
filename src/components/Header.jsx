import { UNIT_META } from '../engine/units.js'

export default function Header({ unitSystem, onUnitSystem, onReset, onDemo }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="28" height="28">
            <rect x="3" y="14" width="26" height="4" rx="1" fill="currentColor" />
            <polygon points="3,18 8,26 0,26" fill="currentColor" />
            <polygon points="29,18 32,26 24,26" fill="currentColor" />
            <path d="M16 4 v8" stroke="currentColor" strokeWidth="2" />
            <polygon points="16,14 13.5,8 18.5,8" fill="currentColor" />
          </svg>
        </div>
        <div>
          <p className="eyebrow">Structural analysis</p>
          <h1>SFD &amp; BMD Calculator</h1>
        </div>
      </div>
      <div className="header-actions">
        <div className="segmented" role="group" aria-label="Unit system">
          {Object.values(UNIT_META).map((unit) => (
            <button
              key={unit.id}
              type="button"
              className={unitSystem === unit.id ? 'active' : ''}
              onClick={() => onUnitSystem(unit.id)}
            >
              {unit.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn ghost" onClick={onDemo}>
          Load demo
        </button>
        <button type="button" className="btn" onClick={onReset}>
          Reset
        </button>
      </div>
    </header>
  )
}

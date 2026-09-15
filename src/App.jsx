import { useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import InputPanel from './components/InputPanel.jsx'
import BeamDiagram from './components/BeamDiagram.jsx'
import DiagramChart from './components/DiagramChart.jsx'
import ResultsPanel from './components/ResultsPanel.jsx'
import ConventionNote from './components/ConventionNote.jsx'
import { analyzeBeam } from './engine/analysis.js'
import { UNIT_SYSTEMS } from './engine/constants.js'
import { EXAMPLES, createEmptyModel } from './engine/examples.js'
import { UNIT_META, convertModel, fromSI } from './engine/units.js'
import './App.css'

function convertResult(result, system) {
  if (!result.ok) return result
  const L = (v) => fromSI(v, 'length', system)
  const F = (v) => fromSI(v, 'force', system)
  const M = (v) => fromSI(v, 'moment', system)
  return {
    ...result,
    reactions: result.reactions.map((r) => ({
      ...r,
      position: L(r.position),
      value: r.kind === 'force' ? F(r.value) : M(r.value),
    })),
    stations: result.stations.map(L),
    sfd: result.sfd.map((p) => ({ ...p, x: L(p.x), value: F(p.value) })),
    bmd: result.bmd.map((p) => ({ ...p, x: L(p.x), value: M(p.value) })),
    zeroShear: result.zeroShear.map((z) => ({ ...z, x: L(z.x) })),
    contraflexure: result.contraflexure.map((z) => ({
      ...z,
      x: L(z.x),
      shear: F(z.shear),
    })),
    stationValues: result.stationValues.map((row) => ({
      ...row,
      x: L(row.x),
      shearLeft: F(row.shearLeft),
      shearRight: F(row.shearRight),
      momentLeft: M(row.momentLeft),
      momentRight: M(row.momentRight),
    })),
    summary: {
      maxShear: F(result.summary.maxShear),
      maxShearX: L(result.summary.maxShearX),
      minShear: F(result.summary.minShear),
      minShearX: L(result.summary.minShearX),
      maxMoment: M(result.summary.maxMoment),
      maxMomentX: L(result.summary.maxMomentX),
      minMoment: M(result.summary.minMoment),
      minMomentX: L(result.summary.minMomentX),
    },
  }
}

export default function App() {
  const [model, setModel] = useState(() => EXAMPLES[9].model)
  const [unitSystem, setUnitSystem] = useState(UNIT_SYSTEMS.SI)
  const [bmdTensionSide, setBmdTensionSide] = useState(false)

  const siResult = useMemo(() => analyzeBeam(model), [model])
  const displayModel = useMemo(
    () => convertModel(model, UNIT_SYSTEMS.SI, unitSystem),
    [model, unitSystem],
  )
  const result = useMemo(() => convertResult(siResult, unitSystem), [siResult, unitSystem])
  const units = UNIT_META[unitSystem]

  const setDisplayModel = (updater) => {
    setModel((prev) => {
      const currentDisplay = convertModel(prev, UNIT_SYSTEMS.SI, unitSystem)
      const nextDisplay = typeof updater === 'function' ? updater(currentDisplay) : updater
      return convertModel(nextDisplay, unitSystem, UNIT_SYSTEMS.SI)
    })
  }

  const handleUnits = (next) => {
    setUnitSystem(next)
  }

  const sfdMarkers = result.ok
    ? [
        { x: result.summary.maxShearX, value: result.summary.maxShear, label: 'Vmax' },
        { x: result.summary.minShearX, value: result.summary.minShear, label: 'Vmin' },
        ...result.zeroShear.map((z) => ({ x: z.x, value: 0, label: 'V = 0' })),
      ]
    : []

  const bmdMarkers = result.ok
    ? [
        { x: result.summary.maxMomentX, value: result.summary.maxMoment, label: 'M sagging' },
        { x: result.summary.minMomentX, value: result.summary.minMoment, label: 'M hogging' },
        ...result.contraflexure.map((z) => ({ x: z.x, value: 0, label: 'M = 0' })),
      ]
    : []

  return (
    <div className="app-shell">
      <Header
        unitSystem={unitSystem}
        onUnitSystem={handleUnits}
        onReset={() => setModel(createEmptyModel(6))}
        onDemo={() => setModel(EXAMPLES[9].model)}
      />
      <div className="app-body">
        <div className="input-column">
          <InputPanel
            model={displayModel}
            setModel={setDisplayModel}
            units={unitSystem}
            errors={siResult.errors}
            warnings={siResult.warnings}
            onExample={(ex) => {
              setUnitSystem(UNIT_SYSTEMS.SI)
              setModel(ex.model)
            }}
          />
          <ConventionNote />
        </div>
        <main className="workspace">
          <BeamDiagram model={displayModel} result={result} units={units} />
          <div className="plot-toolbar">
            <label className="toggle">
              <input
                type="checkbox"
                checked={bmdTensionSide}
                onChange={(e) => setBmdTensionSide(e.target.checked)}
              />
              Plot BMD on the tension side
            </label>
          </div>
          <DiagramChart
            title="Shear force diagram (SFD)"
            points={result.sfd}
            length={Number(displayModel.length) || 0}
            unit={units.force}
            xUnit={units.length}
            color="#3ee0c5"
            fillPos="rgba(62, 224, 197, 0.22)"
            fillNeg="rgba(240, 113, 120, 0.22)"
            markers={sfdMarkers}
          />
          <DiagramChart
            title="Bending moment diagram (BMD)"
            points={result.bmd}
            length={Number(displayModel.length) || 0}
            unit={units.moment}
            xUnit={units.length}
            color="#f0b429"
            fillPos="rgba(240, 180, 41, 0.22)"
            fillNeg="rgba(127, 168, 255, 0.22)"
            invert={bmdTensionSide}
            markers={bmdMarkers}
          />
          <ResultsPanel result={result} units={units} />
        </main>
      </div>
    </div>
  )
}

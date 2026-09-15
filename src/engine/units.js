import { UNIT_SYSTEMS } from './constants.js'

const M_TO_FT = 3.280839895
const KN_TO_KIP = 0.224808943
const KNM_TO_KIPFT = KN_TO_KIP * M_TO_FT
const KNPM_TO_KIPFT = KN_TO_KIP / M_TO_FT

export const UNIT_META = {
  [UNIT_SYSTEMS.SI]: {
    id: UNIT_SYSTEMS.SI,
    label: 'SI',
    length: 'm',
    force: 'kN',
    udl: 'kN/m',
    moment: 'kN·m',
  },
  [UNIT_SYSTEMS.US]: {
    id: UNIT_SYSTEMS.US,
    label: 'US',
    length: 'ft',
    force: 'kip',
    udl: 'kip/ft',
    moment: 'kip·ft',
  },
}

/** Convert a stored SI value into the active display system. */
export function fromSI(value, kind, system, digits) {
  if (!Number.isFinite(value)) return value
  let out = value
  if (system !== UNIT_SYSTEMS.SI) {
    switch (kind) {
      case 'length':
        out = value * M_TO_FT
        break
      case 'force':
        out = value * KN_TO_KIP
        break
      case 'udl':
        out = value * KNPM_TO_KIPFT
        break
      case 'moment':
        out = value * KNM_TO_KIPFT
        break
      default:
        out = value
    }
  }
  if (Number.isFinite(digits)) {
    return Number(out.toFixed(digits))
  }
  return out
}

/** Convert a display-system value into stored SI. */
export function toSI(value, kind, system) {
  if (system === UNIT_SYSTEMS.SI || !Number.isFinite(value)) return value
  switch (kind) {
    case 'length':
      return value / M_TO_FT
    case 'force':
      return value / KN_TO_KIP
    case 'udl':
      return value / KNPM_TO_KIPFT
    case 'moment':
      return value / KNM_TO_KIPFT
    default:
      return value
  }
}

const DISPLAY_DIGITS = {
  length: 4,
  force: 4,
  udl: 4,
  moment: 4,
}

export function convertModel(model, fromSystem, toSystem) {
  if (fromSystem === toSystem) return model
  const mapNum = (value, kind) => {
    if (value === '' || value === '-' || value === '.' || value === '-.') return value
    const n = Number(value)
    if (!Number.isFinite(n)) return value
    return fromSI(toSI(n, kind, fromSystem), kind, toSystem, DISPLAY_DIGITS[kind])
  }
  return {
    ...model,
    length: mapNum(model.length, 'length'),
    supportA: mapNum(model.supportA, 'length'),
    supportB: mapNum(model.supportB, 'length'),
    pointLoads: model.pointLoads.map((load) => ({
      ...load,
      magnitude: mapNum(load.magnitude, 'force'),
      position: mapNum(load.position, 'length'),
    })),
    udls: model.udls.map((load) => ({
      ...load,
      magnitude: mapNum(load.magnitude, 'udl'),
      start: mapNum(load.start, 'length'),
      end: mapNum(load.end, 'length'),
    })),
    pointMoments: model.pointMoments.map((load) => ({
      ...load,
      magnitude: mapNum(load.magnitude, 'moment'),
      position: mapNum(load.position, 'length'),
    })),
  }
}

export function formatNumber(value, digits = 3) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) < 1e-10) return '0'
  const rounded = Number(n.toFixed(digits))
  return String(rounded)
}

export function formatSigned(value, digits = 3) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) < 1e-10) return '0'
  const rounded = Number(n.toFixed(digits))
  return rounded > 0 ? `+${rounded}` : String(rounded)
}

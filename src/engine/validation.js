import { SUPPORT_TYPES, TOL } from './constants.js'

export function toNum(value) {
  if (value === '' || value === '-' || value === '.' || value === '-.') return NaN
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : NaN
}

export function validateBeam(model) {
  const errors = []
  const warnings = []
  const L = toNum(model.length)

  if (!Number.isFinite(L) || L <= 0) {
    errors.push('Beam length must be a number greater than zero.')
    return { ok: false, errors, warnings, length: L }
  }

  const supportType = model.supportType
  if (!Object.values(SUPPORT_TYPES).includes(supportType)) {
    errors.push('Select a valid support type.')
  }

  let supportA = toNum(model.supportA)
  let supportB = toNum(model.supportB)
  if (supportType === SUPPORT_TYPES.SIMPLY_SUPPORTED) {
    if (!Number.isFinite(supportA)) supportA = 0
    if (!Number.isFinite(supportB)) supportB = L
    if (supportA < -TOL || supportB > L + TOL) {
      errors.push('Support positions must lie on the beam.')
    }
    if (supportB - supportA < 1e-6) {
      errors.push('The two simple supports must be separated along the beam.')
    }
  }

  model.pointLoads.forEach((load, i) => {
    const p = toNum(load.magnitude)
    const x = toNum(load.position)
    const n = i + 1
    if (!Number.isFinite(p)) errors.push(`Point load ${n}: magnitude is required.`)
    if (!Number.isFinite(x)) errors.push(`Point load ${n}: position is required.`)
    else if (x < -TOL || x > L + TOL) errors.push(`Point load ${n}: position must be between 0 and L.`)
  })

  model.udls.forEach((load, i) => {
    const w = toNum(load.magnitude)
    const a = toNum(load.start)
    const b = toNum(load.end)
    const n = i + 1
    if (!Number.isFinite(w)) errors.push(`UDL ${n}: intensity is required.`)
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      errors.push(`UDL ${n}: start and end positions are required.`)
    } else {
      if (a < -TOL || b > L + TOL) errors.push(`UDL ${n}: must lie on the beam.`)
      if (b - a <= TOL) errors.push(`UDL ${n}: end must be greater than start.`)
    }
  })

  model.pointMoments.forEach((load, i) => {
    const m = toNum(load.magnitude)
    const x = toNum(load.position)
    const n = i + 1
    if (!Number.isFinite(m)) errors.push(`Moment ${n}: magnitude is required.`)
    if (!Number.isFinite(x)) errors.push(`Moment ${n}: position is required.`)
    else if (x < -TOL || x > L + TOL) errors.push(`Moment ${n}: position must be between 0 and L.`)
  })

  if (
    model.pointLoads.length === 0 &&
    model.udls.length === 0 &&
    model.pointMoments.length === 0
  ) {
    warnings.push('No loads applied — reactions, shear and moment are zero.')
  }

  return { ok: errors.length === 0, errors, warnings, length: L, supportA, supportB }
}

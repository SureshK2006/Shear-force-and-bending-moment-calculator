import { EQ_TOL, SAMPLE_POINTS, SUPPORT_TYPES, TOL } from './constants.js'
import { toNum, validateBeam } from './validation.js'

function nearly(a, b, tol = TOL) {
  return Math.abs(a - b) <= tol
}

function uniqueSorted(values) {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  const out = []
  for (const v of sorted) {
    if (!out.length || !nearly(v, out[out.length - 1])) out.push(v)
  }
  return out
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function parseModel(model) {
  const L = toNum(model.length)
  const pointLoads = model.pointLoads.map((load) => ({
    magnitude: toNum(load.magnitude),
    position: toNum(load.position),
  }))
  const udls = model.udls.map((load) => ({
    magnitude: toNum(load.magnitude),
    start: toNum(load.start),
    end: toNum(load.end),
  }))
  const pointMoments = model.pointMoments.map((load) => ({
    magnitude: toNum(load.magnitude),
    position: toNum(load.position),
  }))
  return { L, pointLoads, udls, pointMoments, supportType: model.supportType }
}

function totalDownwardLoad({ pointLoads, udls }) {
  const points = pointLoads.reduce((s, p) => s + p.magnitude, 0)
  const distributed = udls.reduce((s, u) => s + u.magnitude * (u.end - u.start), 0)
  return points + distributed
}

/** Clockwise moment of all applied loads about x = origin. */
function loadMomentAbout(origin, { pointLoads, udls, pointMoments }) {
  let m = 0
  for (const p of pointLoads) m += p.magnitude * (p.position - origin)
  for (const u of udls) {
    const len = u.end - u.start
    const centroid = (u.start + u.end) / 2
    m += u.magnitude * len * (centroid - origin)
  }
  for (const mom of pointMoments) m += mom.magnitude
  return m
}

function netUdlAt(x, udls, side) {
  let w = 0
  for (const u of udls) {
    const afterStart = side === 'after' ? x >= u.start - TOL : x > u.start + TOL
    const beforeEnd = side === 'after' ? x < u.end - TOL : x <= u.end + TOL
    if (afterStart && beforeEnd) w += u.magnitude
  }
  return w
}

export function shearAt(x, parsed, reactions, side = 'after') {
  const include = (pos) => (side === 'after' ? pos <= x + TOL : pos < x - TOL)
  let v = 0
  for (const r of reactions) {
    if (r.kind === 'force' && include(r.position)) v += r.value
  }
  for (const p of parsed.pointLoads) {
    if (include(p.position)) v -= p.magnitude
  }
  for (const u of parsed.udls) {
    const start = u.start
    const end = u.end
    let loadedEnd
    if (side === 'after') loadedEnd = Math.min(x, end)
    else loadedEnd = Math.min(x, end)
    if (side === 'before' && nearly(x, start)) {
      continue
    }
    if (loadedEnd > start + TOL) {
      const cover = Math.max(0, loadedEnd - start)
      v -= u.magnitude * cover
    }
  }
  return v
}

export function momentAt(x, parsed, reactions, side = 'after') {
  const includeForce = (pos) => pos <= x + TOL
  const includeMoment = (pos) => (side === 'after' ? pos <= x + TOL : pos < x - TOL)
  let m = 0

  for (const r of reactions) {
    if (r.kind === 'moment' && includeMoment(r.position) && r.position < parsed.L - 10 * TOL) {
      m += r.value
    }
    if (r.kind === 'force' && includeForce(r.position)) {
      m += r.value * (x - r.position)
    }
  }
  for (const p of parsed.pointLoads) {
    if (includeForce(p.position)) m -= p.magnitude * (x - p.position)
  }
  for (const u of parsed.udls) {
    const loadedEnd = Math.min(x, u.end)
    const a = Math.max(0, loadedEnd - u.start)
    if (a > TOL) {
      const centroid = u.start + a / 2
      m -= u.magnitude * a * (x - centroid)
    }
  }
  for (const mom of parsed.pointMoments) {
    if (includeMoment(mom.position)) m += mom.magnitude
  }
  return m
}

function solveSimplySupported(parsed, supportA, supportB) {
  const W = totalDownwardLoad(parsed)
  const mA = loadMomentAbout(supportA, parsed)
  const span = supportB - supportA
  const RB = mA / span
  const RA = W - RB
  return [
    { id: 'RA', kind: 'force', position: supportA, value: RA, label: 'R_A' },
    { id: 'RB', kind: 'force', position: supportB, value: RB, label: 'R_B' },
  ]
}

function solveCantileverLeft(parsed) {
  const W = totalDownwardLoad(parsed)
  const m0 = loadMomentAbout(0, parsed)
  return [
    { id: 'RA', kind: 'force', position: 0, value: W, label: 'R_A' },
    { id: 'MA', kind: 'moment', position: 0, value: -m0, label: 'M_A' },
  ]
}

function solveCantileverRight(parsed) {
  const W = totalDownwardLoad(parsed)
  const mL = momentAt(parsed.L, parsed, [], 'before')
  return [
    { id: 'RB', kind: 'force', position: parsed.L, value: W, label: 'R_B' },
    { id: 'MB', kind: 'moment', position: parsed.L, value: mL, label: 'M_B' },
  ]
}

function integrateEndDeflection(parsed, reactions) {
  const L = parsed.L
  const n = 480
  const dx = L / n
  let sum = 0
  for (let i = 0; i <= n; i += 1) {
    const x = i * dx
    const M = momentAt(x, parsed, reactions, 'after')
    const Munit = L - x
    const weight = i === 0 || i === n ? 0.5 : 1
    sum += weight * M * Munit * dx
  }
  return sum
}

function solveProppedCantilever(parsed) {
  const primary = solveCantileverLeft(parsed)
  const L = parsed.L
  const delta = integrateEndDeflection(parsed, primary)
  const fBB = (L ** 3) / 3
  const RB = -delta / fBB
  const RAPrimary = primary.find((r) => r.kind === 'force').value
  const MAPrimary = primary.find((r) => r.kind === 'moment').value
  return [
    { id: 'RA', kind: 'force', position: 0, value: RAPrimary - RB, label: 'R_A' },
    { id: 'MA', kind: 'moment', position: 0, value: MAPrimary + RB * L, label: 'M_A' },
    { id: 'RB', kind: 'force', position: L, value: RB, label: 'R_B' },
  ]
}

function solveReactions(parsed, supportA, supportB) {
  switch (parsed.supportType) {
    case SUPPORT_TYPES.SIMPLY_SUPPORTED:
      return solveSimplySupported(parsed, supportA, supportB)
    case SUPPORT_TYPES.CANTILEVER_LEFT:
      return solveCantileverLeft(parsed)
    case SUPPORT_TYPES.CANTILEVER_RIGHT:
      return solveCantileverRight(parsed)
    case SUPPORT_TYPES.PROPPED_CANTILEVER:
      return solveProppedCantilever(parsed)
    default:
      return []
  }
}

function collectStations(parsed, reactions, supportA, supportB) {
  const xs = [0, parsed.L, supportA, supportB]
  for (const r of reactions) xs.push(r.position)
  for (const p of parsed.pointLoads) xs.push(p.position)
  for (const u of parsed.udls) {
    xs.push(u.start, u.end)
  }
  for (const m of parsed.pointMoments) xs.push(m.position)
  return uniqueSorted(xs.map((x) => clamp(x, 0, parsed.L)))
}

function quadraticRoots(a, b, c) {
  const roots = []
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) >= 1e-12) roots.push(-c / b)
    return roots
  }
  const disc = b * b - 4 * a * c
  if (disc < -TOL) return roots
  if (Math.abs(disc) <= TOL) {
    roots.push(-b / (2 * a))
    return roots
  }
  const s = Math.sqrt(disc)
  roots.push((-b + s) / (2 * a), (-b - s) / (2 * a))
  return roots
}

function findZeroShear(stations, parsed, reactions) {
  const zeros = []
  for (let i = 0; i < stations.length - 1; i += 1) {
    const a = stations[i]
    const b = stations[i + 1]
    if (b - a < TOL) continue
    const va = shearAt(a, parsed, reactions, 'after')
    const vb = shearAt(b, parsed, reactions, 'before')
    const w = netUdlAt((a + b) / 2, parsed.udls, 'after')
    if (Math.abs(va) <= 1e-7) {
      zeros.push({ x: a, shear: 0 })
      continue
    }
    if (Math.abs(va) > 1e-7 && Math.abs(vb) <= 1e-7) {
      zeros.push({ x: b, shear: 0 })
      continue
    }
    if (va * vb < 0) {
      const x = Math.abs(w) < 1e-10 ? a + (-va / (vb - va)) * (b - a) : a + va / w
      if (x > a + TOL && x < b - TOL) zeros.push({ x, shear: 0 })
    }
  }
  return uniqueSorted(zeros.map((z) => z.x)).map((x) => ({ x, shear: 0 }))
}

function findContraflexure(stations, parsed, reactions) {
  const zeros = []
  for (let i = 0; i < stations.length - 1; i += 1) {
    const x0 = stations[i]
    const x1 = stations[i + 1]
    if (x1 - x0 < TOL) continue
    const M0 = momentAt(x0, parsed, reactions, 'after')
    const V0 = shearAt(x0, parsed, reactions, 'after')
    const w = netUdlAt((x0 + x1) / 2, parsed.udls, 'after')
    const roots = quadraticRoots(-w / 2, V0, M0)
    for (const t of roots) {
      const x = x0 + t
      if (x > x0 + 1e-6 && x < x1 - 1e-6) {
        zeros.push(x)
      }
    }
  }
  return uniqueSorted(zeros)
    .filter((x) => x > TOL && x < parsed.L - TOL)
    .map((x) => ({
      x,
      moment: 0,
      shear: shearAt(x, parsed, reactions, 'after'),
    }))
}

function sampleDiagrams(stations, parsed, reactions) {
  const sfd = []
  const bmd = []
  const samples = []

  const push = (x, side) => {
    const shear = shearAt(x, parsed, reactions, side)
    const moment = momentAt(x, parsed, reactions, side)
    samples.push({ x, side, shear, moment })
    return { x, shear, moment }
  }

  for (let i = 0; i < stations.length; i += 1) {
    const x = stations[i]
    const left = push(x, 'before')
    const right = push(x, 'after')
    sfd.push({ x, value: left.shear, side: 'before' })
    if (!nearly(left.shear, right.shear, 1e-7)) {
      sfd.push({ x, value: right.shear, side: 'after' })
    } else if (i === 0) {
      sfd[sfd.length - 1] = { x, value: right.shear, side: 'after' }
    }
    bmd.push({ x, value: left.moment, side: 'before' })
    if (!nearly(left.moment, right.moment, 1e-7)) {
      bmd.push({ x, value: right.moment, side: 'after' })
    } else if (i === 0) {
      bmd[bmd.length - 1] = { x, value: right.moment, side: 'after' }
    }

    if (i < stations.length - 1) {
      const next = stations[i + 1]
      const w = netUdlAt((x + next) / 2, parsed.udls, 'after')
      const n = w !== 0 ? Math.max(12, Math.ceil(((next - x) / parsed.L) * SAMPLE_POINTS)) : 1
      for (let k = 1; k < n; k += 1) {
        const xi = x + ((next - x) * k) / n
        const pt = push(xi, 'after')
        sfd.push({ x: xi, value: pt.shear, side: 'after' })
        bmd.push({ x: xi, value: pt.moment, side: 'after' })
      }
    }
  }

  return { sfd, bmd, samples }
}

function extrema(points) {
  let max = { x: 0, value: -Infinity }
  let min = { x: 0, value: Infinity }
  for (const p of points) {
    if (p.value > max.value) max = p
    if (p.value < min.value) min = p
  }
  return { max, min }
}

function stationTable(stations, parsed, reactions, extra = []) {
  const xs = uniqueSorted([...stations, ...extra])
  return xs.map((x) => {
    const labels = []
    if (nearly(x, 0)) labels.push('x = 0')
    if (nearly(x, parsed.L)) labels.push('x = L')
    for (const r of reactions) {
      if (nearly(x, r.position)) labels.push(r.label)
    }
    parsed.pointLoads.forEach((p, i) => {
      if (nearly(x, p.position)) labels.push(`P${i + 1}`)
    })
    parsed.udls.forEach((u, i) => {
      if (nearly(x, u.start)) labels.push(`UDL${i + 1} start`)
      if (nearly(x, u.end)) labels.push(`UDL${i + 1} end`)
    })
    parsed.pointMoments.forEach((m, i) => {
      if (nearly(x, m.position)) labels.push(`M${i + 1}`)
    })
    return {
      x,
      label: labels.join(' · ') || '',
      shearLeft: shearAt(x, parsed, reactions, 'before'),
      shearRight: shearAt(x, parsed, reactions, 'after'),
      momentLeft: momentAt(x, parsed, reactions, 'before'),
      momentRight: momentAt(x, parsed, reactions, 'after'),
    }
  })
}

function emptyResult(errors, warnings) {
  return {
    ok: false,
    errors,
    warnings,
    reactions: [],
    stations: [],
    sfd: [],
    bmd: [],
    samples: [],
    stationValues: [],
    zeroShear: [],
    contraflexure: [],
    summary: {
      maxShear: 0,
      maxShearX: 0,
      minShear: 0,
      minShearX: 0,
      maxMoment: 0,
      maxMomentX: 0,
      minMoment: 0,
      minMomentX: 0,
    },
    residuals: { fy: 0, vLeft: 0, vRight: 0, mLeft: 0, mRight: 0 },
  }
}

export function analyzeBeam(model) {
  const check = validateBeam(model)
  if (!check.ok) return emptyResult(check.errors, check.warnings)

  const parsed = parseModel(model)
  const supportA =
    parsed.supportType === SUPPORT_TYPES.SIMPLY_SUPPORTED ? check.supportA : 0
  const supportB =
    parsed.supportType === SUPPORT_TYPES.SIMPLY_SUPPORTED ? check.supportB : parsed.L

  const reactions = solveReactions(parsed, supportA, supportB)
  const stations = collectStations(parsed, reactions, supportA, supportB)
  const zeroShear = findZeroShear(stations, parsed, reactions)
  const contraflexure = findContraflexure(stations, parsed, reactions)
  const extraStations = [...zeroShear.map((z) => z.x), ...contraflexure.map((z) => z.x)]
  const allStations = uniqueSorted([...stations, ...extraStations])
  const { sfd, bmd, samples } = sampleDiagrams(allStations, parsed, reactions)

  const shearExt = extrema(sfd)
  const momentExt = extrema(bmd)

  const fyResidual =
    reactions.filter((r) => r.kind === 'force').reduce((s, r) => s + r.value, 0) -
    totalDownwardLoad(parsed)
  const vLeft = shearAt(0, parsed, reactions, 'before')
  const vRight = shearAt(parsed.L, parsed, reactions, 'after')
  const mLeft = momentAt(0, parsed, reactions, 'before')
  const mRightEnd = momentAt(parsed.L, parsed, reactions, 'after')

  const warnings = [...check.warnings]
  if (Math.abs(fyResidual) > EQ_TOL) {
    warnings.push('Vertical equilibrium residual is larger than expected. Check inputs.')
  }
  if (Math.abs(vRight) > EQ_TOL) {
    warnings.push('Shear just to the right of x = L should be ~0. Results may be inconsistent.')
  }

  return {
    ok: true,
    errors: [],
    warnings,
    reactions,
    stations: allStations,
    sfd,
    bmd,
    samples,
    stationValues: stationTable(stations, parsed, reactions, extraStations),
    zeroShear,
    contraflexure,
    summary: {
      maxShear: shearExt.max.value,
      maxShearX: shearExt.max.x,
      minShear: shearExt.min.value,
      minShearX: shearExt.min.x,
      maxMoment: momentExt.max.value,
      maxMomentX: momentExt.max.x,
      minMoment: momentExt.min.value,
      minMomentX: momentExt.min.x,
    },
    residuals: {
      fy: fyResidual,
      vLeft,
      vRight,
      mLeft,
      mRight: mRightEnd,
    },
    parsed,
    supportA,
    supportB,
  }
}

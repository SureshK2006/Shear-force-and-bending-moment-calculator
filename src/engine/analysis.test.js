import { analyzeBeam } from './analysis.js'
import { SUPPORT_TYPES } from './constants.js'

function assertClose(actual, expected, tol, label) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
}

function reaction(result, id) {
  const item = result.reactions.find((r) => r.id === id)
  if (!item) throw new Error(`Missing reaction ${id}`)
  return item.value
}

function run(name, fn) {
  try {
    fn()
    console.log(`PASS  ${name}`)
    return true
  } catch (error) {
    console.error(`FAIL  ${name}`)
    console.error(`      ${error.message}`)
    return false
  }
}

const tests = []
function test(name, fn) {
  tests.push({ name, fn })
}

test('SS mid-span point load PL/4', () => {
  const r = analyzeBeam({
    length: 4,
    supportType: SUPPORT_TYPES.SIMPLY_SUPPORTED,
    supportA: 0,
    supportB: 4,
    pointLoads: [{ magnitude: 10, position: 2 }],
    udls: [],
    pointMoments: [],
  })
  assertClose(reaction(r, 'RA'), 5, 1e-6, 'RA')
  assertClose(reaction(r, 'RB'), 5, 1e-6, 'RB')
  assertClose(r.summary.maxMoment, 10, 1e-4, 'Mmax')
  assertClose(r.summary.maxMomentX, 2, 1e-4, 'Mmax x')
  assertClose(r.summary.maxShear, 5, 1e-4, 'Vmax')
  assertClose(r.summary.minShear, -5, 1e-4, 'Vmin')
  assertClose(r.residuals.vRight, 0, 1e-4, 'V(L+)')
})

test('SS full UDL wL^2/8', () => {
  const r = analyzeBeam({
    length: 6,
    supportType: SUPPORT_TYPES.SIMPLY_SUPPORTED,
    supportA: 0,
    supportB: 6,
    pointLoads: [],
    udls: [{ magnitude: 10, start: 0, end: 6 }],
    pointMoments: [],
  })
  assertClose(reaction(r, 'RA'), 30, 1e-4, 'RA')
  assertClose(reaction(r, 'RB'), 30, 1e-4, 'RB')
  assertClose(r.summary.maxMoment, 45, 0.05, 'Mmax')
  assertClose(r.summary.maxMomentX, 3, 0.05, 'Mmax x')
  assertClose(r.zeroShear[0].x, 3, 0.05, 'zero shear')
})

test('SS two point loads', () => {
  const r = analyzeBeam({
    length: 8,
    supportType: SUPPORT_TYPES.SIMPLY_SUPPORTED,
    supportA: 0,
    supportB: 8,
    pointLoads: [
      { magnitude: 20, position: 2 },
      { magnitude: 40, position: 6 },
    ],
    udls: [],
    pointMoments: [],
  })
  assertClose(reaction(r, 'RA'), 25, 1e-6, 'RA')
  assertClose(reaction(r, 'RB'), 35, 1e-6, 'RB')
  const at6 = r.stationValues.find((s) => Math.abs(s.x - 6) < 1e-8)
  assertClose(at6.momentLeft, 70, 1e-4, 'M at 6 m')
})

test('SS partial UDL', () => {
  const r = analyzeBeam({
    length: 8,
    supportType: SUPPORT_TYPES.SIMPLY_SUPPORTED,
    supportA: 0,
    supportB: 8,
    pointLoads: [],
    udls: [{ magnitude: 10, start: 0, end: 4 }],
    pointMoments: [],
  })
  assertClose(reaction(r, 'RA'), 30, 1e-4, 'RA')
  assertClose(reaction(r, 'RB'), 10, 1e-4, 'RB')
  assertClose(r.summary.maxMoment, 45, 0.05, 'Mmax')
  assertClose(r.summary.maxMomentX, 3, 0.05, 'Mmax x')
})

test('Cantilever tip load', () => {
  const r = analyzeBeam({
    length: 3,
    supportType: SUPPORT_TYPES.CANTILEVER_LEFT,
    supportA: 0,
    supportB: 3,
    pointLoads: [{ magnitude: 15, position: 3 }],
    udls: [],
    pointMoments: [],
  })
  assertClose(reaction(r, 'RA'), 15, 1e-6, 'RA')
  assertClose(reaction(r, 'MA'), -45, 1e-4, 'MA')
  assertClose(r.summary.minMoment, -45, 1e-4, 'Mmin')
  assertClose(r.summary.maxShear, 15, 1e-4, 'Vmax')
})

test('Cantilever full UDL', () => {
  const r = analyzeBeam({
    length: 4,
    supportType: SUPPORT_TYPES.CANTILEVER_LEFT,
    supportA: 0,
    supportB: 4,
    pointLoads: [],
    udls: [{ magnitude: 5, start: 0, end: 4 }],
    pointMoments: [],
  })
  assertClose(reaction(r, 'RA'), 20, 1e-4, 'RA')
  assertClose(reaction(r, 'MA'), -40, 1e-3, 'MA')
  const mid = r.bmd.find((s) => Math.abs(s.x - 2) < 0.05)
  // M(x) = -40 + 20x - 2.5 x^2 → M(2) = -40 + 40 - 10 = -10
  assertClose(mid.value, -10, 0.08, 'M(2)')
})

test('Cantilever right tip load', () => {
  const r = analyzeBeam({
    length: 3,
    supportType: SUPPORT_TYPES.CANTILEVER_RIGHT,
    supportA: 0,
    supportB: 3,
    pointLoads: [{ magnitude: 15, position: 0 }],
    udls: [],
    pointMoments: [],
  })
  assertClose(reaction(r, 'RB'), 15, 1e-6, 'RB')
  assertClose(reaction(r, 'MB'), -45, 1e-4, 'MB')
})

test('Overhanging beam', () => {
  const r = analyzeBeam({
    length: 10,
    supportType: SUPPORT_TYPES.SIMPLY_SUPPORTED,
    supportA: 2,
    supportB: 8,
    pointLoads: [
      { magnitude: 10, position: 0 },
      { magnitude: 20, position: 5 },
      { magnitude: 10, position: 10 },
    ],
    udls: [],
    pointMoments: [],
  })
  assertClose(reaction(r, 'RA'), 20, 1e-4, 'RA')
  assertClose(reaction(r, 'RB'), 20, 1e-4, 'RB')
  const at2 = r.stationValues.find((s) => Math.abs(s.x - 2) < 1e-8)
  assertClose(at2.momentLeft, -20, 1e-4, 'M at support A')
})

test('Propped cantilever full UDL', () => {
  const r = analyzeBeam({
    length: 4,
    supportType: SUPPORT_TYPES.PROPPED_CANTILEVER,
    supportA: 0,
    supportB: 4,
    pointLoads: [],
    udls: [{ magnitude: 10, start: 0, end: 4 }],
    pointMoments: [],
  })
  assertClose(reaction(r, 'RA'), 25, 0.05, 'RA 5wL/8')
  assertClose(reaction(r, 'RB'), 15, 0.05, 'RB 3wL/8')
  assertClose(reaction(r, 'MA'), -20, 0.08, 'MA -wL^2/8')
})

test('SS applied clockwise moment', () => {
  const r = analyzeBeam({
    length: 5,
    supportType: SUPPORT_TYPES.SIMPLY_SUPPORTED,
    supportA: 0,
    supportB: 5,
    pointLoads: [],
    udls: [],
    pointMoments: [{ magnitude: 20, position: 2.5 }],
  })
  assertClose(reaction(r, 'RA'), -4, 1e-4, 'RA')
  assertClose(reaction(r, 'RB'), 4, 1e-4, 'RB')
  const at = r.stationValues.find((s) => Math.abs(s.x - 2.5) < 1e-8)
  assertClose(at.momentLeft, -10, 1e-3, 'M left of couple')
  assertClose(at.momentRight, 10, 1e-3, 'M right of couple')
})

test('Rejects invalid length', () => {
  const r = analyzeBeam({
    length: 0,
    supportType: SUPPORT_TYPES.SIMPLY_SUPPORTED,
    supportA: 0,
    supportB: 0,
    pointLoads: [],
    udls: [],
    pointMoments: [],
  })
  if (r.ok) throw new Error('Expected validation failure')
})

let passed = 0
for (const t of tests) {
  if (run(t.name, t.fn)) passed += 1
}
console.log(`\n${passed}/${tests.length} tests passed`)
if (passed !== tests.length) process.exit(1)

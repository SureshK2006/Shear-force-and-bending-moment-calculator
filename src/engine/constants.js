export const SUPPORT_TYPES = {
  SIMPLY_SUPPORTED: 'simply-supported',
  CANTILEVER_LEFT: 'cantilever-left',
  CANTILEVER_RIGHT: 'cantilever-right',
  PROPPED_CANTILEVER: 'propped-cantilever',
}

export const SUPPORT_LABELS = {
  [SUPPORT_TYPES.SIMPLY_SUPPORTED]: 'Simply supported',
  [SUPPORT_TYPES.CANTILEVER_LEFT]: 'Cantilever (fixed left)',
  [SUPPORT_TYPES.CANTILEVER_RIGHT]: 'Cantilever (fixed right)',
  [SUPPORT_TYPES.PROPPED_CANTILEVER]: 'Propped cantilever',
}

export const UNIT_SYSTEMS = {
  SI: 'si',
  US: 'us',
}

export const TOL = 1e-8
export const EQ_TOL = 1e-4
export const SAMPLE_POINTS = 48

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

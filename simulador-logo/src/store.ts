import { create } from 'zustand'
import { BLOCK_DEFS } from './plc/blockDefs'
import { createBlock, newId } from './plc/build'
import { emptyFupState, type FupResult, type FupState } from './plc/fup'
import type { Block, BlockType, Circuit, PlcState, ScanResult } from './plc/types'
import { RAIL } from './plc/types'
import { emptyPlcState } from './plc/scan'
import { getScenario, SCENARIOS } from './scenarios'

export type Selection = { kind: 'block'; ids: string[] } | { kind: 'wire'; id: string } | null

/** programa que maneja el proceso: el KOP editable o el FUP del .lsc */
export type Program = 'ladder' | 'fup'

export interface SimSnapshot {
  result: ScanResult | null
  plc: PlcState
  /** el FUP corre siempre a la par del KOP (si el escenario lo tiene), con las mismas entradas */
  fup: FupResult | null
  fupState: FupState
  phys: unknown
  /** segundos simulados desde el último reinicio */
  t: number
  /** historial de sensores (unidades reales) para las curvas */
  history: Record<string, number[]>
}

interface AppState {
  circuit: Circuit
  past: Circuit[]
  future: Circuit[]
  selection: Selection
  /** bloque elegido en la paleta, listo para colocar con un clic */
  armed: BlockType | null
  editing: string | null
  running: boolean
  speed: number
  zoom: number
  program: Program
  scenarioId: string
  params: Record<string, number>
  digital: Record<string, boolean>
  /** la hora del día avanza sola con el tiempo simulado */
  clockOn: boolean
  sim: SimSnapshot

  /** guarda una foto del circuito para deshacer y aplica el cambio */
  commit: (fn: (c: Circuit) => Circuit) => void
  /** cambio en vivo sin historial (arrastres); antes llamar a checkpoint() */
  live: (fn: (c: Circuit) => Circuit) => void
  checkpoint: () => void
  undo: () => void
  redo: () => void
  addBlock: (type: BlockType, x: number, y: number) => void
  updateBlock: (id: string, patch: Partial<Block>) => void
  addWire: (from: string, to: string, pin: number) => void
  deleteSelection: () => void
  select: (s: Selection) => void
  arm: (t: BlockType | null) => void
  edit: (id: string | null) => void
  setRunning: (r: boolean) => void
  setSpeed: (s: number) => void
  setZoom: (z: number) => void
  setProgram: (p: Program) => void
  setParam: (k: string, v: number) => void
  setDigital: (op: string, v: boolean) => void
  setClockOn: (on: boolean) => void
  setScenario: (id: string) => void
  loadCircuit: (c: Circuit) => void
  resetProcess: () => void
}

// v2: el circuito de ejemplo del invernadero cambió (riego por horario, alarmas, etapas);
// con otra clave, quien tenía guardado el ejemplo viejo recibe el nuevo
const STORAGE_KEY = 'simulador-logo.v2'

const snap = (c: Circuit): Circuit => ({ blocks: c.blocks.map((b) => ({ ...b, params: { ...b.params } })), wires: c.wires.map((w) => ({ ...w })) })

function scenarioDefaults(id: string) {
  const s = getScenario(id)
  const params: Record<string, number> = {}
  for (const sl of s.sliders) params[sl.key] = sl.default
  const digital: Record<string, boolean> = {}
  for (const d of s.digital) digital[d.op] = d.default
  return { params, digital, phys: s.init(params) }
}

function freshSim(phys: unknown): SimSnapshot {
  return { result: null, plc: emptyPlcState(), fup: null, fupState: emptyFupState(), phys, t: 0, history: {} }
}

function loadSaved(): { circuit: Circuit; scenarioId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.circuit?.blocks || !SCENARIOS.some((s) => s.id === data.scenarioId)) return null
    return data
  } catch {
    return null
  }
}

const saved = loadSaved()
const initialScenario = saved?.scenarioId ?? SCENARIOS[0].id
const initDefaults = scenarioDefaults(initialScenario)

export const useStore = create<AppState>((set, get) => ({
  circuit: saved?.circuit ?? getScenario(initialScenario).example(),
  past: [],
  future: [],
  selection: null,
  armed: null,
  editing: null,
  running: true,
  speed: 20,
  zoom: 1,
  program: 'ladder',
  scenarioId: initialScenario,
  params: initDefaults.params,
  digital: initDefaults.digital,
  clockOn: false,
  sim: freshSim(initDefaults.phys),

  commit: (fn) => set((s) => ({ past: [...s.past.slice(-60), snap(s.circuit)], future: [], circuit: fn(snap(s.circuit)) })),
  live: (fn) => set((s) => ({ circuit: fn(s.circuit) })),
  checkpoint: () => set((s) => ({ past: [...s.past.slice(-60), snap(s.circuit)], future: [] })),
  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1]
      if (!prev) return {}
      return { circuit: prev, past: s.past.slice(0, -1), future: [snap(s.circuit), ...s.future], selection: null }
    }),
  redo: () =>
    set((s) => {
      const next = s.future[0]
      if (!next) return {}
      return { circuit: next, future: s.future.slice(1), past: [...s.past, snap(s.circuit)], selection: null }
    }),

  addBlock: (type, x, y) => {
    let id = ''
    get().commit((c) => {
      const def = BLOCK_DEFS[type]
      let op: string | undefined
      if (def.operand === 'coil') {
        const used = new Set(c.blocks.filter((b) => BLOCK_DEFS[b.type].operand === 'coil').map((b) => b.op))
        for (let n = 1; n <= 16; n++) if (!used.has(`Q${n}`)) { op = `Q${n}`; break }
      }
      const b = createBlock(c.blocks, type, x, y, op)
      id = b.id
      return { ...c, blocks: [...c.blocks, b] }
    })
    set({ selection: { kind: 'block', ids: [id] }, armed: null })
  },

  updateBlock: (id, patch) => get().commit((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

  addWire: (from, to, pin) => {
    const c = get().circuit
    if (from === to) return
    if (c.wires.some((w) => w.from === from && w.to === to && w.pin === pin)) return
    get().commit((c) => ({ ...c, wires: [...c.wires, { id: newId('w'), from, to, pin }] }))
  },

  deleteSelection: () => {
    const sel = get().selection
    if (!sel) return
    get().commit((c) => {
      if (sel.kind === 'wire') return { ...c, wires: c.wires.filter((w) => w.id !== sel.id) }
      const del = new Set(sel.ids)
      return {
        blocks: c.blocks.filter((b) => !del.has(b.id)),
        wires: c.wires.filter((w) => !del.has(w.to) && (w.from === RAIL || !del.has(w.from))),
      }
    })
    set({ selection: null })
  },

  select: (selection) => set({ selection }),
  arm: (armed) => set({ armed }),
  edit: (editing) => set({ editing }),
  setRunning: (running) =>
    set((s) => ({
      running,
      sim: running ? s.sim : { ...s.sim, plc: emptyPlcState(), result: null, fupState: emptyFupState(), fup: null },
    })),
  setSpeed: (speed) => set({ speed }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.5, zoom)) }),
  setProgram: (program) => set({ program }),
  setParam: (k, v) => set((s) => ({ params: { ...s.params, [k]: v } })),
  setDigital: (op, v) => set((s) => ({ digital: { ...s.digital, [op]: v } })),
  setClockOn: (clockOn) => set({ clockOn }),
  setScenario: (id) => {
    const d = scenarioDefaults(id)
    set({ scenarioId: id, params: d.params, digital: d.digital, clockOn: false, sim: freshSim(d.phys), circuit: getScenario(id).example(), past: [], future: [], selection: null })
  },
  loadCircuit: (circuit) => {
    get().commit(() => circuit)
    set((s) => ({ selection: null, sim: { ...s.sim, plc: emptyPlcState(), result: null } }))
  },
  resetProcess: () => set((s) => ({ sim: freshSim(getScenario(s.scenarioId).init(s.params)) })),
}))

/** Salidas Q del programa que mueve el proceso (KOP o FUP). */
export const selectOutputs = (s: AppState): Record<string, boolean> | undefined =>
  s.program === 'fup' && getScenario(s.scenarioId).fup ? s.sim.fup?.outputs : s.sim.result?.outputs

// Guarda el circuito en este navegador (solo comodidad: si falla, la app sigue igual).
let saveTimer: ReturnType<typeof setTimeout> | undefined
useStore.subscribe((s, prev) => {
  if (s.circuit === prev.circuit && s.scenarioId === prev.scenarioId) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ circuit: s.circuit, scenarioId: s.scenarioId }))
    } catch {
      /* almacenamiento no disponible */
    }
  }, 400)
})

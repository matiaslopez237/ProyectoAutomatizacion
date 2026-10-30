// Programa FUP (diagrama de funciones) exportado de un .lsc de LOGO!Soft con generador-lld/exportar-fup.bsh.
// Solo se ve y se simula: no se edita.
import { hysteresis, inWindow } from './scan'
import type { FbState, PlcInputs } from './types'

/** [x, y, ancho, alto] en coordenadas del dibujo de LOGO!Soft */
export type Box = [number, number, number, number]

export type FupKind =
  | 'Input'
  | 'AnalogInput'
  | 'Output'
  | 'And'
  | 'Or'
  | 'Not'
  | 'OnDelay'
  | 'OffDelay'
  | 'LatchingRelay'
  | 'Counter'
  | 'AnalogTrigger'
  | 'Clock'

export interface FupInput {
  /** número del bloque de origen (I1, B004…); null = entrada sin conectar */
  from: string | null
  neg: boolean
  box: Box | null
}

export interface FupBlock {
  /** I1, AI3, Q1 o B001… */
  id: string
  kind: FupKind
  box: Box
  name?: string
  inputs: FupInput[]
  out: Box | null
  params: { T?: number; gain?: number; offset?: number; On?: number; Off?: number; cams?: [number, number][] }
  paramText: string
  paramBox: Box | null
}

export interface FupWire {
  from: string
  to: string
  pin: number
  points: [number, number][]
}

export interface FupProgram {
  source: string
  blocks: FupBlock[]
  wires: FupWire[]
  comments: { text: string; x: number; y: number }[]
}

export interface FupState {
  /** salida de cada bloque en el scan anterior */
  values: Record<string, boolean>
  fb: Record<string, FbState>
}

export interface FupResult {
  state: FupState
  /** salida de cada bloque en este scan */
  values: Record<string, boolean>
  /** valor analógico de entradas analógicas y disparadores */
  ana: Record<string, number>
  outputs: Record<string, boolean>
}

export const emptyFupState = (): FupState => ({ values: {}, fb: {} })

// Las funciones especiales y las salidas Q se leen del scan anterior, igual que los contactos de SF y Q en KOP:
// así ambos programas dan lo mismo y los lazos (Q1 -> ... -> Q1) quedan cortados.
const READS_PREVIOUS = new Set<FupKind>(['Output', 'OnDelay', 'OffDelay', 'LatchingRelay', 'Counter', 'AnalogTrigger', 'Clock'])

/** Un ciclo de scan del programa FUP con las mismas entradas que usa el KOP. */
export function scanFup(prog: FupProgram, prev: FupState, inputs: PlcInputs, dt: number): FupResult {
  const byId = new Map(prog.blocks.map((b) => [b.id, b]))
  const values: Record<string, boolean> = {}
  const ana: Record<string, number> = {}
  const fb: Record<string, FbState> = {}

  const source = (id: string): boolean => {
    const b = byId.get(id)
    if (!b) return false
    return READS_PREVIOUS.has(b.kind) ? !!prev.values[id] : evalBlock(b)
  }
  /** entrada conectada: su valor (negado si corresponde); sin conectar: undefined */
  const pin = (b: FupBlock, i: number): boolean | undefined => {
    const inp = b.inputs[i]
    if (!inp?.from) return undefined
    const v = source(inp.from)
    return inp.neg ? !v : v
  }
  const on = (b: FupBlock, i: number) => pin(b, i) ?? false
  const analog = (b: FupBlock, i: number): number => {
    const from = b.inputs[i]?.from
    if (!from) return 0
    const src = byId.get(from)
    if (src?.kind === 'AnalogInput') return inputs.ana[from] ?? 0
    return ana[from] ?? 0
  }

  function evalBlock(b: FupBlock): boolean {
    if (b.id in values) return values[b.id]
    values[b.id] = false // corta lazos entre compuertas, que en LOGO! no se permiten
    const p = b.params
    const old: FbState = prev.fb[b.id] ?? { q: false }
    let v = false
    switch (b.kind) {
      case 'Input':
        v = !!inputs.bin[b.id]
        break
      case 'AnalogInput':
        ana[b.id] = inputs.ana[b.id] ?? 0
        v = false
        break
      case 'Output':
        v = on(b, 0)
        break
      case 'And': {
        // en LOGO! las entradas libres de un AND valen 1
        const used = b.inputs.map((_, i) => pin(b, i)).filter((x) => x !== undefined)
        v = used.length > 0 && used.every(Boolean)
        break
      }
      case 'Or':
        v = b.inputs.some((_, i) => pin(b, i) === true)
        break
      case 'Not':
        v = !on(b, 0)
        break
      case 'OnDelay': {
        const trg = on(b, 0)
        const T = p.T ?? 0
        const t = trg ? Math.min(T, (old.t ?? 0) + dt) : 0
        v = trg && t >= T
        fb[b.id] = { q: v, t }
        break
      }
      case 'OffDelay': {
        const trg = on(b, 0)
        const T = p.T ?? 0
        let q = old.q
        let t = old.t ?? 0
        if (trg) {
          q = true
          t = 0
        } else if (q) {
          t += dt
          if (t >= T) {
            q = false
            t = T
          }
        }
        v = q
        fb[b.id] = { q, t }
        break
      }
      case 'LatchingRelay': {
        const s = on(b, 0)
        const r = on(b, 1)
        v = r ? false : s ? true : old.q
        fb[b.id] = { q: v }
        break
      }
      case 'Counter': {
        const r = on(b, 0)
        const cnt = on(b, 1)
        const dir = on(b, 2)
        let count = old.count ?? 0
        if (r) count = 0
        else if (cnt && !old.lastCnt) count = Math.max(0, count + (dir ? -1 : 1))
        v = hysteresis(count, (p.On ?? 0) - 0.5, (p.Off ?? 0) - 0.5, old.q)
        fb[b.id] = { q: v, count, lastCnt: cnt }
        break
      }
      case 'AnalogTrigger': {
        const value = analog(b, 0) * (p.gain ?? 1) + (p.offset ?? 0)
        v = hysteresis(value, p.On ?? 0, p.Off ?? 0, old.q)
        ana[b.id] = value
        fb[b.id] = { q: v, value }
        break
      }
      case 'Clock': {
        const h = (inputs.hour ?? 0) % 24
        v = (p.cams ?? []).some(([a, z]) => inWindow(h, a, z))
        fb[b.id] = { q: v }
        break
      }
    }
    values[b.id] = v
    return v
  }

  for (const b of prog.blocks) evalBlock(b)

  const outputs: Record<string, boolean> = {}
  for (const b of prog.blocks) if (b.kind === 'Output') outputs[b.id] = values[b.id]
  return { state: { values, fb }, values, ana, outputs }
}

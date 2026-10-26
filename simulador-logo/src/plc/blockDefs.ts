import type { BlockType } from './types'

export interface ParamDef {
  key: string
  label: string
  step: number
  min?: number
  max?: number
  unit?: string
}

export interface BlockDef {
  type: BlockType
  /** nombre como en la paleta de LOGO!Soft (versión en español) */
  name: string
  /** nombres de las entradas, en orden */
  pins: string[]
  /** true si la salida lleva un valor analógico */
  analogOut?: boolean
  /** funciones especiales: se nombran solas (T001, C001, SF001) */
  fbPrefix?: string
  /** bobinas: no tienen salida */
  noOutput?: boolean
  /** qué tipo de operando acepta */
  operand?: 'contact' | 'coil' | 'analog'
  params?: ParamDef[]
  defaults?: Record<string, number>
  group: 'const' | 'timer' | 'counter' | 'analog' | 'misc'
}

const analogParams: ParamDef[] = [
  { key: 'On', label: 'Umbral de conexión (On)', step: 1 },
  { key: 'Off', label: 'Umbral de desconexión (Off)', step: 1 },
  { key: 'gain', label: 'Ganancia', step: 0.01 },
  { key: 'offset', label: 'Offset', step: 1 },
]

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  NO: { type: 'NO', name: 'Contacto normalmente abierto', pins: ['in'], operand: 'contact', group: 'const' },
  NC: { type: 'NC', name: 'Contacto normalmente cerrado', pins: ['in'], operand: 'contact', group: 'const' },
  ANA: { type: 'ANA', name: 'Contacto analógico', pins: ['in'], operand: 'analog', analogOut: true, group: 'const' },
  COIL: { type: 'COIL', name: 'Bobina de relé', pins: ['in'], operand: 'coil', noOutput: true, group: 'const' },
  NCOIL: { type: 'NCOIL', name: 'Salida invertida', pins: ['in'], operand: 'coil', noOutput: true, group: 'const' },
  TON: {
    type: 'TON', name: 'Retardo a la conexión', pins: ['Trg'], fbPrefix: 'T', group: 'timer',
    params: [{ key: 'T', label: 'Tiempo', step: 0.1, min: 0, unit: 's' }], defaults: { T: 5 },
  },
  TOF: {
    type: 'TOF', name: 'Retardo a la desconexión', pins: ['Trg'], fbPrefix: 'T', group: 'timer',
    params: [{ key: 'T', label: 'Tiempo', step: 0.1, min: 0, unit: 's' }], defaults: { T: 5 },
  },
  CTR: {
    type: 'CTR', name: 'Contador adelante/atrás', pins: ['R', 'Cnt', 'Dir'], fbPrefix: 'C', group: 'counter',
    params: [
      { key: 'On', label: 'Umbral de conexión (On)', step: 1, min: 0 },
      { key: 'Off', label: 'Umbral de desconexión (Off)', step: 1, min: 0 },
    ],
    defaults: { On: 10, Off: 10 },
  },
  RS: { type: 'RS', name: 'Relé autoenclavador', pins: ['S', 'R'], fbPrefix: 'SF', group: 'misc' },
  ATRIG: {
    type: 'ATRIG', name: 'Conmutador analógico de valor umbral', pins: ['Ax'], fbPrefix: 'SF', group: 'analog',
    params: analogParams, defaults: { On: 50, Off: 40, gain: 0.1, offset: 0 },
  },
  ACMP: {
    type: 'ACMP', name: 'Comparador analógico', pins: ['Ax', 'Ay'], fbPrefix: 'SF', group: 'analog',
    params: analogParams, defaults: { On: 10, Off: 5, gain: 0.1, offset: 0 },
  },
}

export const isFb = (t: BlockType) => BLOCK_DEFS[t].fbPrefix !== undefined

/** Pines que esperan un valor analógico */
export const isAnalogPin = (t: BlockType, pin: number) =>
  (t === 'ATRIG' && pin === 0) || (t === 'ACMP' && (pin === 0 || pin === 1))

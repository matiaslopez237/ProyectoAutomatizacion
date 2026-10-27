// Modelo del programa KOP. Es el mismo que usa el generador de .lld (contactos, bobinas y funciones especiales).

export type BlockType =
  | 'NO' // contacto normalmente abierto
  | 'NC' // contacto normalmente cerrado
  | 'ANA' // contacto analógico (lleva el valor de una AI)
  | 'COIL' // bobina de relé
  | 'NCOIL' // salida invertida
  | 'TON' // retardo a la conexión
  | 'TOF' // retardo a la desconexión
  | 'CTR' // contador adelante/atrás
  | 'RS' // relé autoenclavador (SET / RESET)
  | 'ATRIG' // conmutador analógico de valor umbral
  | 'ACMP' // comparador analógico
  | 'WEEK' // temporizador semanal (franjas horarias del día)

export interface Block {
  id: string
  type: BlockType
  x: number
  y: number
  /** Operando: I1, Q1, M1, AI1, T001… En funciones especiales es su propio nombre. */
  op: string
  params: Record<string, number>
  comment?: string
}

export const RAIL = 'RAIL'

export interface Wire {
  id: string
  /** id del bloque de origen o RAIL (barra de alimentación izquierda) */
  from: string
  to: string
  /** índice de la entrada del bloque destino */
  pin: number
}

export interface Circuit {
  blocks: Block[]
  wires: Wire[]
}

export interface PlcInputs {
  bin: Record<string, boolean>
  /** valores crudos 0…1000, como los lee LOGO! */
  ana: Record<string, number>
  /** hora del reloj del PLC (0…24), para el temporizador semanal */
  hour?: number
}

export interface FbState {
  q: boolean
  /** tiempo transcurrido (s) en temporizadores */
  t?: number
  count?: number
  lastCnt?: boolean
  /** valor analógico calculado (ya con ganancia y offset) */
  value?: number
}

export interface PlcState {
  /** imagen de proceso del scan anterior: Q, M y salidas de funciones especiales */
  image: Record<string, boolean>
  fb: Record<string, FbState>
}

export interface BlockEval {
  /** estado de cada entrada (con señal o no) */
  inputs: boolean[]
  out: boolean
  ana?: number
}

export interface ScanResult {
  state: PlcState
  blocks: Record<string, BlockEval>
  /** ids de los cables que llevan señal */
  powered: Set<string>
  /** salidas Q después del scan */
  outputs: Record<string, boolean>
}

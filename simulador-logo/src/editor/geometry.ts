import { BLOCK_DEFS, isFb } from '../plc/blockDefs'
import type { Block } from '../plc/types'

// Medidas tomadas de los .lld de LOGO!Soft: contactos y bobinas de 36×49, conexión a 29 px del borde superior.
export const GRID = 10
export const RAIL_X = 20
export const PIN_Y = 29
export const PIN_GAP = 20

export const snap = (v: number) => Math.round(v / GRID) * GRID

export function blockSize(b: Block) {
  if (isFb(b.type)) return { w: 56, h: 49 + PIN_GAP * Math.max(0, BLOCK_DEFS[b.type].pins.length - 1) }
  return { w: 36, h: 49 }
}

export function inPin(b: Block, i: number) {
  return { x: b.x, y: b.y + PIN_Y + PIN_GAP * i }
}

export function outPin(b: Block) {
  const { w } = blockSize(b)
  const n = Math.max(1, BLOCK_DEFS[b.type].pins.length)
  return { x: b.x + w, y: b.y + PIN_Y + (isFb(b.type) ? (PIN_GAP * (n - 1)) / 2 : 0) }
}

/**
 * Recorrido ortogonal de un cable, con el codo cerca de la entrada como en LOGO!Soft.
 * Cada entrada de un bloque dobla en su propia columna (8 px más a la izquierda por entrada),
 * así los cables que llegan a S y a R de un mismo bloque no se superponen.
 */
export function wirePath(s: { x: number; y: number }, e: { x: number; y: number }, pin = 0) {
  if (e.x - s.x >= 24 + 8 * pin) {
    if (s.y === e.y) return { d: `M${s.x} ${s.y} H${e.x}`, bend: null }
    const mx = e.x - 12 - 8 * pin
    return { d: `M${s.x} ${s.y} H${mx} V${e.y} H${e.x}`, bend: { x: mx, y: e.y } }
  }
  // destino a la izquierda: rodea por abajo
  const y2 = Math.max(s.y, e.y) + 34
  return { d: `M${s.x} ${s.y} H${s.x + 10} V${y2} H${e.x - 10} V${e.y} H${e.x}`, bend: { x: e.x - 10, y: e.y } }
}

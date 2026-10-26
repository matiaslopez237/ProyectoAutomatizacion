import { BLOCK_DEFS } from './blockDefs'
import type { Block, BlockType, Circuit, Wire } from './types'
import { RAIL } from './types'

let seq = 0
export const newId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

/** Siguiente nombre libre para una función especial: T001, C001, SF001… */
export function nextFbName(blocks: Block[], prefix: string): string {
  const used = new Set(blocks.map((b) => b.op))
  for (let n = 1; ; n++) {
    const name = `${prefix}${String(n).padStart(3, '0')}`
    if (!used.has(name)) return name
  }
}

export function createBlock(blocks: Block[], type: BlockType, x: number, y: number, op?: string): Block {
  const def = BLOCK_DEFS[type]
  let name = op
  if (def.fbPrefix) name = nextFbName(blocks, def.fbPrefix)
  else if (!name) name = def.operand === 'coil' ? 'Q1' : def.operand === 'analog' ? 'AI1' : 'I1'
  return { id: newId('b'), type, x, y, op: name, params: { ...(def.defaults ?? {}) } }
}

/** Ayuda para armar circuitos por código (circuitos de ejemplo y tests). */
export class CircuitBuilder {
  blocks: Block[] = []
  wires: Wire[] = []

  add(type: BlockType, x: number, y: number, op?: string, comment?: string, params?: Record<string, number>): Block {
    const b = createBlock(this.blocks, type, x, y, op)
    if (comment) b.comment = comment
    if (params) b.params = { ...b.params, ...params }
    this.blocks.push(b)
    return b
  }

  /** Contacto NA (o NC si neg) */
  c(op: string, x: number, y: number, comment?: string, neg = false) {
    return this.add(neg ? 'NC' : 'NO', x, y, op, comment)
  }

  coil(op: string, x: number, y: number, comment?: string) {
    return this.add('COIL', x, y, op, comment)
  }

  wire(from: Block | null, to: Block, pin = 0) {
    this.wires.push({ id: newId('w'), from: from ? from.id : RAIL, to: to.id, pin })
  }

  /** Une en serie desde la barra: barra → a → b → … → destino */
  series(target: Block | null, ...items: Block[]) {
    this.wire(null, items[0])
    for (let i = 1; i < items.length; i++) this.wire(items[i - 1], items[i])
    if (target) this.wire(items[items.length - 1], target)
  }

  build(): Circuit {
    return { blocks: this.blocks, wires: this.wires }
  }
}

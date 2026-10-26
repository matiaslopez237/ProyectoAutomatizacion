import { BLOCK_DEFS, isFb } from './blockDefs'
import type { Circuit } from './types'
import { RAIL } from './types'

export interface Issue {
  level: 'error' | 'warning'
  blockId?: string
  msg: string
}

const OPERAND = {
  contact: /^(I|Q|M)\d+$|^(T|C|SF)\d{3}$/,
  coil: /^(Q|M)\d+$/,
  analog: /^AI\d+$/,
}

/** Revisiones parecidas a las de LOGO!Soft antes de simular. */
export function validate(c: Circuit): Issue[] {
  const issues: Issue[] = []
  const ids = new Set(c.blocks.map((b) => b.id))
  const fbNames = new Set(c.blocks.filter((b) => isFb(b.type)).map((b) => b.op))
  const connected = new Set(c.wires.filter((w) => w.from === RAIL || ids.has(w.from)).map((w) => `${w.to}:${w.pin}`))
  const coilOps = new Map<string, number>()

  for (const b of c.blocks) {
    const def = BLOCK_DEFS[b.type]
    const label = `${b.op || '?'} (${def.name.toLowerCase()})`

    if (def.operand) {
      const ok = OPERAND[def.operand].test(b.op)
      if (!ok) issues.push({ level: 'error', blockId: b.id, msg: `${label}: el operando "${b.op}" no es válido para este bloque.` })
      else if (def.operand === 'contact' && /^(T|C|SF)\d{3}$/.test(b.op) && !fbNames.has(b.op))
        issues.push({ level: 'error', blockId: b.id, msg: `${label}: no existe ninguna función especial ${b.op}.` })
    }
    if (def.operand === 'coil') coilOps.set(b.op, (coilOps.get(b.op) ?? 0) + 1)

    def.pins.forEach((pin, i) => {
      if (connected.has(`${b.id}:${i}`)) return
      // En LOGO!, R y Dir del contador pueden quedar abiertos (valen 0).
      if (b.type === 'CTR' && i !== 1) return
      if (b.type === 'RS' && i === 1) return
      issues.push({
        level: def.operand === 'coil' || b.type === 'NO' || b.type === 'NC' || b.type === 'ANA' ? 'error' : 'warning',
        blockId: b.id,
        msg: `${label}: la entrada ${pin === 'in' ? '' : pin + ' '}no está conectada.`,
      })
    })
  }

  for (const [op, n] of coilOps) if (n > 1) issues.push({ level: 'warning', msg: `${op} se usa en ${n} bobinas. Gana la que da 1 en cualquiera de ellas.` })

  return issues
}

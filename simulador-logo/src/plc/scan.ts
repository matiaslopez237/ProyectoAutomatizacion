import type { Block, BlockEval, Circuit, FbState, PlcInputs, PlcState, ScanResult, Wire } from './types'
import { RAIL } from './types'

export const emptyPlcState = (): PlcState => ({ image: {}, fb: {} })

/** Histéresis de los bloques analógicos y del contador (On >= Off, como en LOGO!). */
export function hysteresis(value: number, on: number, off: number, prev: boolean): boolean {
  if (on >= off) {
    if (value > on) return true
    if (value <= off) return false
    return prev
  }
  // On < Off: ventana, la salida vale 1 entre On y Off
  return value > on && value <= off
}

/** Una leva del temporizador semanal: conexión ≤ hora < desconexión (puede cruzar la medianoche). Igual conexión y desconexión = leva sin usar. */
export function inWindow(h: number, on: number, off: number): boolean {
  if (on === off) return false
  return on < off ? h >= on && h < off : h >= on || h < off
}

/**
 * Un ciclo de scan: lee entradas, recorre la escalera siguiendo los cables desde la barra
 * y actualiza bobinas y funciones especiales.
 * Los contactos de Q, M y funciones especiales leen la imagen del scan anterior, como un PLC real.
 */
export function scan(c: Circuit, prev: PlcState, inputs: PlcInputs, dt: number): ScanResult {
  const byId = new Map<string, Block>()
  for (const b of c.blocks) byId.set(b.id, b)

  const incoming = new Map<string, Wire[]>()
  for (const w of c.wires) {
    if (!byId.has(w.to)) continue
    if (w.from !== RAIL && !byId.has(w.from)) continue
    const k = `${w.to}:${w.pin}`
    const list = incoming.get(k)
    if (list) list.push(w)
    else incoming.set(k, [w])
  }

  const image: Record<string, boolean> = {}
  const fb: Record<string, FbState> = {}
  const evals: Record<string, BlockEval> = {}
  const visiting = new Set<string>()

  const read = (op: string): boolean => {
    if (/^I\d+$/.test(op)) return !!inputs.bin[op]
    return !!prev.image[op]
  }

  const pinPower = (b: Block, pin: number): boolean => {
    const ws = incoming.get(`${b.id}:${pin}`)
    if (!ws) return false
    let on = false
    for (const w of ws) {
      const v = w.from === RAIL ? true : evalBlock(byId.get(w.from)!).out
      on = on || v
    }
    return on
  }

  const pinAnalog = (b: Block, pin: number): number => {
    const ws = incoming.get(`${b.id}:${pin}`)
    if (!ws) return 0
    for (const w of ws) {
      if (w.from === RAIL) continue
      const e = evalBlock(byId.get(w.from)!)
      if (e.ana !== undefined) return e.ana
    }
    return 0
  }

  function evalBlock(b: Block): BlockEval {
    const done = evals[b.id]
    if (done) return done
    // Un lazo de cables sin pasar por una bobina no tiene sentido en KOP: se corta en 0.
    if (visiting.has(b.id)) return { inputs: [], out: false }
    visiting.add(b.id)

    const p = b.params
    const old: FbState = prev.fb[b.op] ?? { q: false }
    let res: BlockEval

    switch (b.type) {
      case 'NO': {
        const i = pinPower(b, 0)
        res = { inputs: [i], out: i && read(b.op) }
        break
      }
      case 'NC': {
        const i = pinPower(b, 0)
        res = { inputs: [i], out: i && !read(b.op) }
        break
      }
      case 'ANA': {
        const i = pinPower(b, 0)
        res = { inputs: [i], out: i, ana: i ? (inputs.ana[b.op] ?? 0) : 0 }
        break
      }
      case 'COIL':
      case 'NCOIL': {
        const i = pinPower(b, 0)
        const v = b.type === 'COIL' ? i : !i
        if (b.op) image[b.op] = (image[b.op] ?? false) || v
        res = { inputs: [i], out: v }
        break
      }
      case 'TON': {
        const trg = pinPower(b, 0)
        const T = p.T ?? 0
        const t = trg ? Math.min(T, (old.t ?? 0) + dt) : 0
        const q = trg && t >= T
        fb[b.op] = { q, t }
        res = { inputs: [trg], out: q }
        break
      }
      case 'TOF': {
        const trg = pinPower(b, 0)
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
        fb[b.op] = { q, t }
        res = { inputs: [trg], out: q }
        break
      }
      case 'CTR': {
        const r = pinPower(b, 0)
        const cnt = pinPower(b, 1)
        const dir = pinPower(b, 2)
        let count = old.count ?? 0
        if (r) count = 0
        else if (cnt && !old.lastCnt) count = Math.max(0, count + (dir ? -1 : 1))
        const q = hysteresis(count, (p.On ?? 0) - 0.5, (p.Off ?? 0) - 0.5, old.q)
        fb[b.op] = { q, count, lastCnt: cnt }
        res = { inputs: [r, cnt, dir], out: q }
        break
      }
      case 'RS': {
        const s = pinPower(b, 0)
        const r = pinPower(b, 1)
        const q = r ? false : s ? true : old.q
        fb[b.op] = { q }
        res = { inputs: [s, r], out: q }
        break
      }
      case 'ATRIG': {
        const ax = pinAnalog(b, 0)
        const value = ax * (p.gain ?? 1) + (p.offset ?? 0)
        const q = hysteresis(value, p.On ?? 0, p.Off ?? 0, old.q)
        fb[b.op] = { q, value }
        res = { inputs: [pinPower(b, 0)], out: q, ana: value }
        break
      }
      case 'WEEK': {
        const h = (inputs.hour ?? 0) % 24
        const q = inWindow(h, p.on1 ?? 0, p.off1 ?? 0) || inWindow(h, p.on2 ?? 0, p.off2 ?? 0)
        fb[b.op] = { q }
        res = { inputs: [], out: q }
        break
      }
      case 'ACMP': {
        const ax = pinAnalog(b, 0)
        const ay = pinAnalog(b, 1)
        const value = (ax - ay) * (p.gain ?? 1) + (p.offset ?? 0)
        const q = hysteresis(value, p.On ?? 0, p.Off ?? 0, old.q)
        fb[b.op] = { q, value }
        res = { inputs: [pinPower(b, 0), pinPower(b, 1)], out: q, ana: value }
        break
      }
    }

    if (fb[b.op] && b.op) image[b.op] = fb[b.op].q
    visiting.delete(b.id)
    evals[b.id] = res
    return res
  }

  for (const b of c.blocks) evalBlock(b)

  const powered = new Set<string>()
  for (const w of c.wires) {
    if (w.from === RAIL) {
      if (byId.has(w.to)) powered.add(w.id)
    } else if (evals[w.from]?.out) powered.add(w.id)
  }

  const outputs: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(image)) if (/^Q\d+$/.test(k)) outputs[k] = v

  return { state: { image, fb }, blocks: evals, powered, outputs }
}

import { describe, expect, it } from 'vitest'
import { CircuitBuilder } from './build'
import { emptyPlcState, scan } from './scan'
import type { Circuit, PlcInputs, PlcState } from './types'
import { validate } from './validate'

/** Corre n scans con las mismas entradas y devuelve el último estado. */
function run(c: Circuit, inputs: Partial<PlcInputs>, n = 2, dt = 0.1, start: PlcState = emptyPlcState()) {
  let state = start
  let res = scan(c, state, { bin: {}, ana: {}, ...inputs }, dt)
  for (let i = 0; i < n; i++) {
    res = scan(c, state, { bin: {}, ana: {}, ...inputs }, dt)
    state = res.state
  }
  return res
}

describe('lógica combinacional (TP1)', () => {
  const b = new CircuitBuilder()
  const q = b.coil('Q1', 400, 20)
  b.series(q, b.c('I1', 40, 20), b.c('I2', 120, 20))
  const and = b.build()

  it('serie AND', () => {
    expect(run(and, { bin: { I1: true, I2: true } }).outputs.Q1).toBe(true)
    expect(run(and, { bin: { I1: true, I2: false } }).outputs.Q1).toBe(false)
  })

  it('paralelo OR', () => {
    const o = new CircuitBuilder()
    const q = o.coil('Q1', 400, 20)
    const a = o.c('I1', 40, 20)
    const c = o.c('I2', 40, 90)
    o.wire(null, a)
    o.wire(null, c)
    o.wire(a, q)
    o.wire(c, q)
    expect(run(o.build(), { bin: { I2: true } }).outputs.Q1).toBe(true)
    expect(run(o.build(), { bin: {} }).outputs.Q1).toBe(false)
  })
})

describe('arranque directo con autorretención (TP2)', () => {
  const b = new CircuitBuilder()
  const q = b.coil('Q1', 500, 20)
  const start = b.c('I1', 40, 20)
  const hold = b.c('Q1', 40, 90)
  const stop = b.c('I2', 200, 20, 'parada', true)
  b.wire(null, start)
  b.wire(null, hold)
  b.wire(start, stop)
  b.wire(hold, stop)
  b.wire(stop, q)
  const c = b.build()

  it('arranca, se mantiene al soltar y para con la parada', () => {
    let r = run(c, { bin: { I1: true } })
    expect(r.outputs.Q1).toBe(true)
    r = run(c, { bin: {} }, 3, 0.1, r.state)
    expect(r.outputs.Q1).toBe(true)
    r = run(c, { bin: { I2: true } }, 2, 0.1, r.state)
    expect(r.outputs.Q1).toBe(false)
    r = run(c, { bin: {} }, 2, 0.1, r.state)
    expect(r.outputs.Q1).toBe(false)
  })

  it('valida sin errores', () => {
    expect(validate(c).filter((i) => i.level === 'error')).toEqual([])
  })
})

describe('funciones especiales (TP3 y TP4)', () => {
  it('retardo a la conexión de 5 s', () => {
    const b = new CircuitBuilder()
    const t = b.add('TON', 400, 20, undefined, undefined, { T: 5 })
    b.series(t, b.c('I1', 40, 20))
    const q = b.coil('Q1', 500, 120)
    b.series(q, b.c(t.op, 40, 120))
    const c = b.build()
    let r = run(c, { bin: { I1: true } }, 40) // 4 s
    expect(r.outputs.Q1).toBe(false)
    r = run(c, { bin: { I1: true } }, 15, 0.1, r.state) // 5,5 s
    expect(r.outputs.Q1).toBe(true)
    r = run(c, { bin: {} }, 2, 0.1, r.state)
    expect(r.outputs.Q1).toBe(false)
  })

  it('retardo a la desconexión mantiene la salida T segundos', () => {
    const b = new CircuitBuilder()
    const t = b.add('TOF', 400, 20, undefined, undefined, { T: 2 })
    b.series(t, b.c('I1', 40, 20))
    const c = b.build()
    let r = run(c, { bin: { I1: true } }, 2)
    expect(r.state.image[t.op]).toBe(true)
    r = run(c, { bin: {} }, 10, 0.1, r.state) // 1 s
    expect(r.state.image[t.op]).toBe(true)
    r = run(c, { bin: {} }, 15, 0.1, r.state) // 2,5 s
    expect(r.state.image[t.op]).toBe(false)
  })

  it('contador adelante/atrás con On = Off = 3', () => {
    const b = new CircuitBuilder()
    const ctr = b.add('CTR', 400, 20, undefined, undefined, { On: 3, Off: 3 })
    const up = b.c('I2', 40, 60)
    const down = b.c('I3', 40, 120)
    b.wire(null, up)
    b.wire(null, down)
    b.wire(up, ctr, 1)
    b.wire(down, ctr, 1)
    b.wire(down, ctr, 2)
    const c = b.build()
    let s = emptyPlcState()
    const pulse = (op: string) => {
      s = scan(c, s, { bin: { [op]: true }, ana: {} }, 0.1).state
      s = scan(c, s, { bin: {}, ana: {} }, 0.1).state
    }
    pulse('I2')
    pulse('I2')
    expect(s.fb[ctr.op].count).toBe(2)
    expect(s.image[ctr.op]).toBe(false)
    pulse('I2')
    expect(s.image[ctr.op]).toBe(true)
    pulse('I3')
    expect(s.fb[ctr.op].count).toBe(2)
    expect(s.image[ctr.op]).toBe(false)
  })

  it('relé autoenclavador: SET, RESET con prioridad', () => {
    const b = new CircuitBuilder()
    const rs = b.add('RS', 400, 20)
    const s = b.c('I1', 40, 20)
    const r = b.c('I2', 40, 90)
    b.wire(null, s)
    b.wire(null, r)
    b.wire(s, rs, 0)
    b.wire(r, rs, 1)
    const c = b.build()
    let res = run(c, { bin: { I1: true } })
    expect(res.state.image[rs.op]).toBe(true)
    res = run(c, { bin: {} }, 2, 0.1, res.state)
    expect(res.state.image[rs.op]).toBe(true)
    res = run(c, { bin: { I1: true, I2: true } }, 2, 0.1, res.state)
    expect(res.state.image[rs.op]).toBe(false)
  })
})

describe('temporizador semanal', () => {
  it('activa la salida dentro de cada leva, incluso si cruza la medianoche', () => {
    const b = new CircuitBuilder()
    const w = b.add('WEEK', 400, 20, undefined, undefined, { on1: 7, off1: 9, on2: 23, off2: 1 })
    const c = b.build()
    const at = (hour: number) => scan(c, emptyPlcState(), { bin: {}, ana: {}, hour }, 0.1).state.image[w.op]
    expect(at(6.9)).toBe(false)
    expect(at(7)).toBe(true)
    expect(at(8.99)).toBe(true)
    expect(at(9)).toBe(false)
    expect(at(23.5)).toBe(true)
    expect(at(0.5)).toBe(true)
    expect(at(1)).toBe(false)
  })
})

describe('analógico (TP5)', () => {
  it('conmutador de umbral con histéresis', () => {
    const b = new CircuitBuilder()
    const tr = b.add('ATRIG', 400, 20, undefined, undefined, { On: 28, Off: 25, gain: 0.1, offset: 0 })
    const ai = b.add('ANA', 40, 20, 'AI1')
    b.wire(null, ai)
    b.wire(ai, tr, 0)
    const c = b.build()
    let r = run(c, { ana: { AI1: 300 } }) // 30 °C
    expect(r.state.image[tr.op]).toBe(true)
    expect(r.blocks[tr.id].ana).toBeCloseTo(30)
    r = run(c, { ana: { AI1: 270 } }, 2, 0.1, r.state) // 27 °C: dentro de la histéresis
    expect(r.state.image[tr.op]).toBe(true)
    r = run(c, { ana: { AI1: 240 } }, 2, 0.1, r.state)
    expect(r.state.image[tr.op]).toBe(false)
  })
})

describe('validación', () => {
  it('avisa entradas abiertas y operandos inexistentes', () => {
    const b = new CircuitBuilder()
    b.coil('Q1', 400, 20)
    b.c('T007', 40, 20)
    const msgs = validate(b.build()).map((i) => i.msg).join('\n')
    expect(msgs).toMatch(/no está conectada/)
    expect(msgs).toMatch(/no existe ninguna función especial T007/)
  })
})

import { describe, expect, it } from 'vitest'
import { emptyFupState, scanFup, type FupProgram } from '../../plc/fup'
import { emptyPlcState, scan } from '../../plc/scan'
import { greenhouseExample } from './example'
import fupJson from './fup.json'
import { initGreenhouse, stepGreenhouse, sunNow } from './physics'

const fup = fupJson as FupProgram
const circuit = greenhouseExample()

/**
 * Corre el KOP (que mueve el proceso) y el FUP del .lsc con las mismas entradas
 * y devuelve cada diferencia de salidas que aparezca.
 */
function compare(params: Record<string, number>, script: (t: number) => Record<string, boolean>, seconds: number, dt = 0.5) {
  let phys = initGreenhouse(params)
  let plc = emptyPlcState()
  let fst = emptyFupState()
  const diffs: string[] = []
  let p = { ...params }
  for (let t = 0; t < seconds; t += dt) {
    p = { ...p, hour: (params.hour + t / 3600) % 24 }
    const digital = script(t)
    const ana = {
      AI1: Math.round(phys.temp * 10),
      AI2: Math.round(phys.rh * 10),
      AI3: Math.round(phys.soil * 10),
      AI4: Math.round(sunNow(p) * 10),
    }
    const inputs = { bin: digital, ana, hour: p.hour }
    const k = scan(circuit, plc, inputs, dt)
    const f = scanFup(fup, fst, inputs, dt)
    plc = k.state
    fst = f.state
    for (let n = 1; n <= 8; n++) {
      const q = `Q${n}`
      if (!!k.outputs[q] !== !!f.outputs[q] && diffs.length < 5) diffs.push(`t=${t}s ${q}: KOP=${!!k.outputs[q]} FUP=${!!f.outputs[q]}`)
    }
    phys = stepGreenhouse(phys, k.outputs, p, digital, dt)
  }
  return diffs
}

describe('FUP del .lsc contra el KOP del simulador', () => {
  it('tiene las 8 salidas y los mismos bloques de función que el ejemplo', () => {
    expect(fup.blocks.filter((b) => b.kind === 'Output').map((b) => b.id).sort()).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'])
    expect(fup.blocks.filter((b) => b.kind === 'AnalogTrigger')).toHaveLength(7)
  })

  it('un día entero en automático, con calor, riego por horario y el reloj avanzando', () => {
    const diffs = compare({ tempExt: 33, rhExt: 30, hour: 0, sun: 80, wind: 20, evap: 2, supply: 100 }, () => ({ I1: true }), 24 * 3600, 2)
    expect(diffs).toEqual([])
  }, 30000)

  it('frío de noche, lluvia, riego manual, emergencia y reconocimiento', () => {
    const script = (t: number) => ({
      I1: t < 5000 || t > 6000,
      I2: t > 1000 && t < 1010,
      I3: t > 3000 && t < 3300,
      I4: t > 2000 && t < 4000,
      I5: (t > 3400 && t < 3402) || (t > 7000 && t < 7002),
    })
    expect(compare({ tempExt: 2, rhExt: 90, hour: 20, sun: 10, wind: 60, evap: 1, supply: 100 }, script, 3 * 3600)).toEqual([])
  })

  it('falla de riego sin agua de red, alarma por temperatura crítica y reconocimiento', () => {
    const script = (t: number) => ({ I1: true, I5: t > 9000 && t < 9002 })
    expect(compare({ tempExt: 42, rhExt: 20, hour: 7, sun: 100, wind: 0, evap: 3, supply: 0 }, script, 4 * 3600)).toEqual([])
  })
})

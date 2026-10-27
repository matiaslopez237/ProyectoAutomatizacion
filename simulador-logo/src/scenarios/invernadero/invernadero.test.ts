import { describe, expect, it } from 'vitest'
import { emptyPlcState, scan } from '../../plc/scan'
import type { PlcState } from '../../plc/types'
import { greenhouseExample } from './example'
import { initGreenhouse, stepGreenhouse, sunNow, type GreenhouseState } from './physics'

const DEFAULTS = { tempExt: 24, rhExt: 45, hour: 13, sun: 75, wind: 20, evap: 1, supply: 100 }
const circuit = greenhouseExample()

/** Corre PLC + proceso juntos, igual que el simulador, y devuelve un registro de salidas por tick. */
class Sim {
  params: Record<string, number>
  digital: Record<string, boolean> = { I1: true }
  phys: GreenhouseState
  plc: PlcState = emptyPlcState()
  out: Record<string, boolean> = {}
  t = 0

  constructor(params: Partial<typeof DEFAULTS> = {}, phys: Partial<GreenhouseState> = {}) {
    this.params = { ...DEFAULTS, ...params }
    this.phys = { ...initGreenhouse(this.params), ...phys }
  }

  run(seconds: number, each?: (s: Sim) => void, dt = 0.5) {
    for (let k = 0; k < seconds / dt; k++) {
      const p = this.params
      const ana = {
        AI1: Math.round(this.phys.temp * 10),
        AI2: Math.round(this.phys.rh * 10),
        AI3: Math.round(this.phys.soil * 10),
        AI4: Math.round(sunNow(p) * 10),
      }
      const r = scan(circuit, this.plc, { bin: this.digital, ana, hour: p.hour }, dt)
      this.plc = r.state
      this.out = r.outputs
      this.phys = stepGreenhouse(this.phys, r.outputs, p, this.digital, dt)
      this.t += dt
      each?.(this)
    }
    return this
  }

  press(op: string, seconds = 1) {
    this.digital = { ...this.digital, [op]: true }
    this.run(seconds)
    this.digital = { ...this.digital, [op]: false }
    return this
  }
}

describe('programa del invernadero', () => {
  it('ventilación por etapas: primero la ventana, a los 3 min el ventilador', () => {
    let tWindow = -1
    let tFan = -1
    new Sim({ tempExt: 34 }).run(900, (s) => {
      if (tWindow < 0 && s.out.Q4) tWindow = s.t
      if (tFan < 0 && s.out.Q2) tFan = s.t
    })
    expect(tWindow).toBeGreaterThanOrEqual(0)
    expect(tFan - tWindow).toBeGreaterThanOrEqual(179)
    expect(tFan - tWindow).toBeLessThan(185)
  })

  it('con lluvia la ventana no abre y el ventilador entra sin esperar', () => {
    const s = new Sim({ tempExt: 34 })
    s.digital = { I1: true, I4: true }
    let window = false
    let tFan = -1
    s.run(600, (x) => {
      window = window || !!x.out.Q4
      if (tFan < 0 && x.out.Q2) tFan = x.t
    })
    expect(window).toBe(false)
    expect(tFan).toBeGreaterThanOrEqual(0)
  })

  it('enclavamientos: el nebulizador no anda con el ventilador y el calefactor no anda con la ventana', () => {
    let mistWithFan = 0
    let heatWithWindow = 0
    new Sim({ tempExt: 34, rhExt: 20 }).run(2400, (s) => {
      if (s.out.Q5 && s.out.Q2) mistWithFan++
      if (s.out.Q3 && s.out.Q4) heatWithWindow++
    })
    // como en un PLC real, el contacto lee el scan anterior: a lo sumo un scan de solapamiento
    expect(mistWithFan).toBeLessThanOrEqual(1)
    expect(heatWithWindow).toBe(0)
  })

  it('riego por horario: suelo seco fuera de horario no riega, en horario sí', () => {
    const out = new Sim({ hour: 13 }, { soil: 25 }).run(20).out
    expect(out.Q1).toBeFalsy()
    const inSchedule = new Sim({ hour: 8 }, { soil: 25 }).run(20).out
    expect(inSchedule.Q1).toBe(true)
  })

  it('suelo muy seco riega a cualquier hora', () => {
    expect(new Sim({ hour: 13 }, { soil: 12 }).run(20).out.Q1).toBe(true)
  })

  it('falla de riego: 10 min regando sin agua corta el riego y avisa hasta reconocer', () => {
    const s = new Sim({ hour: 8, supply: 0 }, { soil: 25 })
    s.run(590)
    expect(s.out.Q1).toBe(true)
    expect(s.out.Q8).toBeFalsy()
    s.run(30)
    expect(s.out.Q8).toBe(true)
    s.run(20) // pasa el retardo de 8 s del TOF
    expect(s.out.Q1).toBeFalsy()
    s.params.supply = 100
    s.press('I5').run(2)
    expect(s.out.Q8).toBeFalsy()
  })

  it('cuenta los ciclos de riego y avisa con el séptimo', () => {
    const s = new Sim({ hour: 13 }, { soil: 60 })
    for (let i = 0; i < 6; i++) s.press('I2').run(12)
    expect(s.out.Q8).toBeFalsy()
    s.press('I2').run(2)
    expect(s.out.Q8).toBe(true)
  })

  it('alarma con memoria: sigue encendida aunque baje la temperatura, y se reconoce con I5', () => {
    const s = new Sim({ tempExt: 42, sun: 100 })
    s.run(1800)
    expect(s.out.Q7).toBe(true)
    s.params.tempExt = 10
    s.params.sun = 0
    s.run(3000)
    expect(s.phys.temp).toBeLessThan(35)
    expect(s.out.Q7).toBe(true)
    s.press('I5').run(1)
    expect(s.out.Q7).toBeFalsy()
  })

  it('no se puede reconocer la alarma mientras la causa sigue presente', () => {
    const s = new Sim()
    s.digital = { I1: true, I3: true }
    s.run(5)
    expect(s.out.Q7).toBe(true)
    s.press('I5')
    expect(s.out.Q7).toBe(true)
  })
})

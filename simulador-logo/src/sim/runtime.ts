import { scan } from '../plc/scan'
import type { PlcInputs } from '../plc/types'
import { getScenario } from '../scenarios'
import { useStore } from '../store'

const TICK_MS = 50
const MAX_STEP = 0.1 // s simulados por sub-paso, para que los temporizadores no salten
const HISTORY_EVERY = 2 // s simulados entre puntos de la curva
const HISTORY_LEN = 150

let timer: ReturnType<typeof setInterval> | undefined
let sinceHistory = 0

/**
 * Bucle de simulación fuera de React: el proceso físico corre siempre;
 * el PLC hace scans solo en RUN. Cada tick escribe una sola vez en el store.
 */
export function startRuntime() {
  if (timer) return
  timer = setInterval(tick, TICK_MS)
}

// En desarrollo, al recargar módulos el intervalo viejo seguiría escribiendo en un store anterior.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearInterval(timer)
    timer = undefined
  })
}

function tick() {
  const st = useStore.getState()
  const scenario = getScenario(st.scenarioId)
  const total = (TICK_MS / 1000) * st.speed
  const steps = Math.max(1, Math.ceil(total / MAX_STEP))
  const dt = total / steps

  let phys = st.sim.phys
  let plc = st.sim.plc
  let result = st.sim.result
  for (let i = 0; i < steps; i++) {
    const inputs: PlcInputs = { bin: { ...st.digital }, ana: {} }
    for (const s of scenario.sensors) {
      const raw = Math.round(s.read(phys, st.params) * s.scale)
      inputs.ana[s.op] = Math.min(1000, Math.max(0, raw))
    }
    if (st.running) {
      result = scan(st.circuit, plc, inputs, dt)
      plc = result.state
    }
    phys = scenario.step(phys, st.running && result ? result.outputs : {}, st.params, st.digital, dt)
  }

  const t = st.sim.t + total
  let history = st.sim.history
  sinceHistory += total
  if (sinceHistory >= HISTORY_EVERY) {
    sinceHistory = 0
    history = { ...history }
    for (const s of scenario.sensors) {
      const arr = history[s.op] ? history[s.op].slice(-(HISTORY_LEN - 1)) : []
      arr.push(s.read(phys, st.params))
      history[s.op] = arr
    }
  }

  useStore.setState({ sim: { result: st.running ? result : null, plc, phys, t, history } })
}

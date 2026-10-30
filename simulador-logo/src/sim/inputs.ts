import { getScenario } from '../scenarios'
import { useStore } from '../store'

export const isDigitalInput = (op: string) => /^I\d+$/.test(op)

/** Cómo se acciona la entrada en el escenario: selector (queda) o pulsador (vale 1 mientras se aprieta). */
export function inputKind(op: string): 'switch' | 'button' {
  const st = useStore.getState()
  return getScenario(st.scenarioId).digital.find((d) => d.op === op)?.kind ?? 'switch'
}

/**
 * Acciona una entrada desde el diagrama (contacto I del ladder o bloque I del FUP), igual que desde los sliders:
 * un selector cambia de posición; un pulsador queda apretado hasta soltar el botón del mouse.
 */
export function actuateInput(op: string) {
  const st = useStore.getState()
  if (inputKind(op) === 'switch') {
    st.setDigital(op, !st.digital[op])
    return
  }
  st.setDigital(op, true)
  const release = () => {
    useStore.getState().setDigital(op, false)
    window.removeEventListener('pointerup', release)
    window.removeEventListener('pointercancel', release)
  }
  window.addEventListener('pointerup', release)
  window.addEventListener('pointercancel', release)
}

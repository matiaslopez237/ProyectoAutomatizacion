import { useMemo } from 'react'
import { validate } from '../plc/validate'
import { getScenario } from '../scenarios'
import { useStore } from '../store'
import { programFile } from './programFile'

/** Pestaña con el nombre del archivo abierto, como la de LOGO!Soft encima del lienzo. */
export function DocTab({ file, note }: { file: string; note?: string }) {
  return (
    <div className="doc-tabs">
      <span className="doc-tab">
        {file}
        {note && <small>{note}</small>}
      </span>
    </div>
  )
}

/** Barra de estado de abajo: qué programa maneja el proceso, estado del programa KOP, archivo y velocidad. */
export function StatusBar() {
  const running = useStore((s) => s.running)
  const program = useStore((s) => s.program)
  const scenarioId = useStore((s) => s.scenarioId)
  const speed = useStore((s) => s.speed)
  const zoom = useStore((s) => s.zoom)
  const circuit = useStore((s) => s.circuit)
  const errors = useMemo(() => validate(circuit).filter((i) => i.level === 'error').length, [circuit])
  const fup = program === 'fup' && !!getScenario(scenarioId).fup

  const msg = !running
    ? 'STOP: el PLC no ejecuta el programa'
    : fup
      ? 'RUN: el proceso lo maneja el programa de bloques (FUP)'
      : errors
        ? `RUN con ${errors} error${errors > 1 ? 'es' : ''} en el programa ladder`
        : 'RUN: el proceso lo maneja el programa ladder (KOP)'

  return (
    <footer className="statusbar" aria-label="Barra de estado">
      <span role="status">{msg}</span>
      <span className="status-cell">{programFile(scenarioId, fup ? 'fup' : 'ladder')}</span>
      <span className="status-cell">LOGO! 8.4</span>
      <span className="status-cell">{Math.round(zoom * 100)} %</span>
      <span className="status-cell">×{speed}</span>
    </footer>
  )
}

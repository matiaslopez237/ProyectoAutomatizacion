import { useMemo } from 'react'
import { validate } from '../plc/validate'
import { useStore } from '../store'

export function InfoWindow() {
  const circuit = useStore((s) => s.circuit)
  const issues = useMemo(() => validate(circuit), [circuit])
  const select = useStore((s) => s.select)
  const errors = issues.filter((i) => i.level === 'error').length

  return (
    <section className="info" aria-label="Info Window">
      <header className="info-head">
        <span>Info Window</span>
        <span className={`chip ${errors ? 'chip-bad' : issues.length ? 'chip-warn' : 'chip-ok'}`}>
          {errors ? `${errors} error${errors > 1 ? 'es' : ''}` : issues.length ? `${issues.length} aviso${issues.length > 1 ? 's' : ''}` : 'Programa sin errores'}
        </span>
        <span className="info-count">
          {circuit.blocks.length} bloques · {circuit.wires.length} conexiones
        </span>
      </header>
      <ul className="info-list" aria-live="polite">
        {issues.length === 0 && <li className="info-ok">Todas las entradas están conectadas y los operandos existen.</li>}
        {issues.map((i, k) => (
          <li key={k} className={`info-${i.level}`}>
            {i.blockId ? (
              <button type="button" onClick={() => select({ kind: 'block', ids: [i.blockId!] })}>
                {i.msg}
              </button>
            ) : (
              i.msg
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

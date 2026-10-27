import { useEffect, useRef } from 'react'
import { getScenario } from '../scenarios'
import { useStore } from '../store'

/** Tabla de entradas y salidas, módulos y diagrama de conexiones del escenario activo. */
export function DocsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const scenarioId = useStore((s) => s.scenarioId)
  const sc = getScenario(scenarioId)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  const rows = [
    ...sc.digital.map((d) => ({ op: d.op, kind: 'Entrada digital', label: d.label, terminal: d.terminal, device: d.device, note: d.hint })),
    ...sc.sensors.map((s) => ({
      op: s.op,
      kind: 'Entrada analógica',
      label: s.label,
      terminal: s.terminal,
      device: s.device,
      note: `0-10 V = 0-1000; con ganancia ${1 / s.scale} queda en ${s.unit}`,
    })),
    ...sc.outputs.map((o) => ({ op: o.op, kind: 'Salida a relé', label: o.label, terminal: o.terminal, device: o.device, note: '' })),
  ]

  return (
    <dialog ref={ref} className="props docs" onClose={onClose} aria-labelledby="docs-title">
      <header>
        <h2 id="docs-title">{sc.name}: conexiones y tabla de E/S</h2>
      </header>
      <div className="props-body docs-body">
        {sc.docs && (
          <section>
            <h3>Hardware</h3>
            <ul className="docs-hw">
              {sc.docs.hardware.map((h) => (
                <li key={h.module}>
                  <strong>{h.module}</strong>
                  <span>{h.role}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3>Entradas y salidas</h3>
          <div className="docs-table-wrap">
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Operando</th>
                  <th>Tipo</th>
                  <th>Función</th>
                  <th>Borne</th>
                  <th>Dispositivo de campo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.op}>
                    <td className="op">{r.op}</td>
                    <td>{r.kind}</td>
                    <td>
                      {r.label}
                      {r.note && <small>{r.note}</small>}
                    </td>
                    <td className="mono">{r.terminal ?? '—'}</td>
                    <td>{r.device ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {sc.docs && (
          <section>
            <h3>Diagrama de conexiones</h3>
            <div className="docs-diagram">
              <img src={sc.docs.wiringSvg} alt={`Diagrama de conexiones del PLC del ${sc.name.toLowerCase()}`} />
            </div>
            {sc.docs.notes && (
              <ul className="docs-notes">
                {sc.docs.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
      <footer>
        <span className="spacer" />
        <button type="button" className="btn" onClick={onClose}>
          Cerrar
        </button>
      </footer>
    </dialog>
  )
}

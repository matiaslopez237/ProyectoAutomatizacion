import { useEffect, useRef, useState } from 'react'
import type { Circuit } from '../plc/types'
import { getScenario } from '../scenarios'
import { useStore } from '../store'

function parseCircuit(text: string): Circuit | string {
  try {
    const data = JSON.parse(text)
    const c = data.circuit ?? data
    if (!Array.isArray(c.blocks) || !Array.isArray(c.wires)) return 'El JSON no tiene "blocks" y "wires".'
    return c as Circuit
  } catch {
    return 'No es un JSON válido. Copiá el texto completo que da Exportar.'
  }
}

export function FileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const circuit = useStore((s) => s.circuit)
  const scenarioId = useStore((s) => s.scenarioId)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setText('')
      setMsg('')
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open])

  const exported = JSON.stringify({ format: 'simulador-logo/1', scenarioId, circuit }, null, 1)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exported)
      setMsg('Programa copiado al portapapeles.')
    } catch {
      const ta = document.getElementById('file-export') as HTMLTextAreaElement | null
      ta?.select()
      setMsg('Seleccioné el texto: copialo con Ctrl+C.')
    }
  }

  const load = (t: string) => {
    const r = parseCircuit(t)
    if (typeof r === 'string') return setMsg(r)
    useStore.getState().loadCircuit(r)
    setMsg(`Programa cargado: ${r.blocks.length} bloques.`)
    onClose()
  }

  return (
    <dialog ref={ref} className="props file" onClose={onClose} aria-labelledby="file-title">
      <header>
        <h2 id="file-title">Programa</h2>
      </header>
      <div className="props-body">
        <div className="file-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              useStore.getState().loadCircuit(getScenario(scenarioId).example())
              onClose()
            }}
          >
            Cargar ejemplo de {getScenario(scenarioId).name.toLowerCase()}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              useStore.getState().loadCircuit({ blocks: [], wires: [] })
              onClose()
            }}
          >
            Programa vacío
          </button>
        </div>

        <label className="field">
          <span>Exportar (JSON)</span>
          <textarea id="file-export" readOnly rows={5} value={exported} />
        </label>
        <div className="file-row">
          <button type="button" className="btn" onClick={copy}>
            Copiar
          </button>
        </div>

        <label className="field">
          <span>Importar: pegá un programa exportado</span>
          <textarea id="file-import" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder='{"format":"simulador-logo/1", …}' />
        </label>
        <div className="file-row">
          <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={() => load(text)}>
            Importar texto
          </button>
          <label className="btn">
            Abrir archivo .json
            <input
              id="file-open"
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) load(await f.text())
              }}
            />
          </label>
        </div>
        {msg && <p className="props-hint" role="status">{msg}</p>}
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

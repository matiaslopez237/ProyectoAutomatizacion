import { useEffect, useRef, useState } from 'react'
import { BLOCK_DEFS, isFb } from '../plc/blockDefs'
import { getScenario } from '../scenarios'
import { useStore } from '../store'

function operandOptions(kind: 'contact' | 'coil' | 'analog', fbNames: string[], labels: Record<string, string>) {
  const range = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i + 1}`)
  const opt = (op: string) => ({ op, label: labels[op] ? `${op} · ${labels[op]}` : op })
  if (kind === 'analog') return [{ group: 'Entradas analógicas', items: range('AI', 8).map(opt) }]
  const groups = [
    { group: 'Salidas', items: range('Q', 16).map(opt) },
    { group: 'Marcas', items: range('M', 24).map(opt) },
  ]
  if (kind === 'coil') return groups
  return [{ group: 'Entradas', items: range('I', 24).map(opt) }, ...groups, { group: 'Funciones especiales', items: fbNames.map(opt) }]
}

export function PropertiesDialog() {
  const editing = useStore((s) => s.editing)
  const block = useStore((s) => s.circuit.blocks.find((b) => b.id === s.editing))
  const blocks = useStore((s) => s.circuit.blocks)
  const scenarioId = useStore((s) => s.scenarioId)
  const ref = useRef<HTMLDialogElement>(null)
  const [op, setOp] = useState('')
  const [comment, setComment] = useState('')
  const [params, setParams] = useState<Record<string, string>>({})

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (block && !d.open) {
      setOp(block.op)
      setComment(block.comment ?? '')
      setParams(Object.fromEntries(Object.entries(block.params).map(([k, v]) => [k, String(v)])))
      d.showModal()
    } else if (!block && d.open) d.close()
  }, [block, editing])

  const close = () => useStore.getState().edit(null)
  if (!block) return <dialog ref={ref} className="props" onClose={close} />

  const def = BLOCK_DEFS[block.type]
  const sc = getScenario(scenarioId)
  const labels: Record<string, string> = {}
  for (const d of sc.digital) labels[d.op] = d.label
  for (const s of sc.sensors) labels[s.op] = s.label
  for (const o of sc.outputs) labels[o.op] = o.label
  const fbNames = blocks.filter((b) => isFb(b.type)).map((b) => b.op)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const p: Record<string, number> = {}
    for (const [k, v] of Object.entries(params)) {
      const n = Number(v.replace(',', '.'))
      p[k] = Number.isFinite(n) ? n : block.params[k]
    }
    useStore.getState().updateBlock(block.id, { op: isFb(block.type) ? block.op : op, comment: comment.trim() || undefined, params: p })
    close()
  }

  return (
    <dialog ref={ref} className="props" onClose={close} aria-labelledby="props-title">
      <form onSubmit={save}>
        <header>
          <h2 id="props-title">
            {block.op} · {def.name}
          </h2>
        </header>
        <div className="props-body">
          {def.operand && (
            <label className="field">
              <span>Operando</span>
              <select id="props-op" value={op} onChange={(e) => setOp(e.target.value)}>
                {operandOptions(def.operand, fbNames, labels).map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map((o) => (
                      <option key={o.op} value={o.op}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
          {def.params?.map((pd) => (
            <label className="field" key={pd.key}>
              <span>
                {pd.label}
                {pd.unit ? ` (${pd.unit})` : ''}
              </span>
              <input
                id={`props-${pd.key}`}
                inputMode="decimal"
                value={params[pd.key] ?? ''}
                onChange={(e) => setParams({ ...params, [pd.key]: e.target.value })}
              />
            </label>
          ))}
          {(block.type === 'ATRIG' || block.type === 'ACMP') && (
            <p className="props-hint">
              El valor que compara es Ax × ganancia + offset. Con ganancia 0,1 una entrada de 0 a 1000 queda en 0 a 100 (°C o %). La salida se activa cuando el valor
              supera On y se apaga cuando baja a Off o menos.
            </p>
          )}
          <label className="field">
            <span>Comentario</span>
            <input id="props-comment" value={comment} maxLength={40} onChange={(e) => setComment(e.target.value)} placeholder="por ejemplo: parada" />
          </label>
        </div>
        <footer>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              useStore.getState().select({ kind: 'block', ids: [block.id] })
              useStore.getState().deleteSelection()
              close()
            }}
          >
            Eliminar bloque
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Aceptar
          </button>
        </footer>
      </form>
    </dialog>
  )
}

import { useStore } from '../store'

export function Toolbar({ onFile }: { onFile: () => void }) {
  const zoom = useStore((s) => s.zoom)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const hasSel = useStore((s) => s.selection !== null)
  const armed = useStore((s) => s.armed)
  const st = useStore.getState

  return (
    <div className="toolbar" role="toolbar" aria-label="Herramientas del editor">
      <button type="button" className="tb" onClick={() => st().undo()} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
        ↶ <span>Deshacer</span>
      </button>
      <button type="button" className="tb" onClick={() => st().redo()} disabled={!canRedo} title="Rehacer (Ctrl+Y)">
        ↷ <span>Rehacer</span>
      </button>
      <button type="button" className="tb" onClick={() => st().deleteSelection()} disabled={!hasSel} title="Borrar selección (Supr)">
        ✕ <span>Borrar</span>
      </button>
      <span className="tb-sep" />
      <button type="button" className="tb" onClick={() => st().setZoom(zoom - 0.1)} title="Alejar" aria-label="Alejar">
        −
      </button>
      <span className="tb-zoom">{Math.round(zoom * 100)} %</span>
      <button type="button" className="tb" onClick={() => st().setZoom(zoom + 0.1)} title="Acercar" aria-label="Acercar">
        +
      </button>
      <span className="tb-sep" />
      <button type="button" className="tb" onClick={onFile} title="Exportar, importar o cargar el ejemplo">
        ⇅ <span>Archivo</span>
      </button>
      {armed && (
        <span className="tb-hint">
          Clic en el lienzo para colocar el bloque · Esc cancela
        </span>
      )}
      {!armed && <span className="tb-hint">Arrastrá desde una salida (o desde la barra) hasta una entrada para conectar. Doble clic edita.</span>}
    </div>
  )
}

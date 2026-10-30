import type { PointerEvent } from 'react'

/**
 * Barra de título de un panel: nombre a la izquierda; expandir (opcional) y cerrar a la derecha.
 * Con onDragStart la barra sirve para arrastrar el panel (ventana flotante).
 */
export function PanelHead({
  title,
  expanded,
  onExpand,
  onClose,
  onDragStart,
}: {
  title: string
  expanded?: boolean
  onExpand?: () => void
  onClose: () => void
  onDragStart?: (e: PointerEvent<HTMLElement>) => void
}) {
  return (
    <header
      className={`panel-head${onDragStart ? ' is-draggable' : ''}`}
      onPointerDown={(e) => {
        if (onDragStart && !(e.target as Element).closest('button')) onDragStart(e)
      }}
      title={onDragStart ? 'Arrastrá la barra para mover la ventana' : undefined}
    >
      <h2>{title}</h2>
      {onExpand && (
        <button
          type="button"
          className="panel-btn"
          onClick={onExpand}
          aria-pressed={expanded}
          title={expanded ? 'Volver al tablero (Esc)' : 'Expandir'}
          aria-label={expanded ? `Achicar ${title}` : `Expandir ${title}`}
        >
          {expanded ? '⤡' : '⤢'}
        </button>
      )}
      <button type="button" className="panel-btn" onClick={onClose} title="Cerrar" aria-label={`Cerrar ${title}`}>
        ✕
      </button>
    </header>
  )
}

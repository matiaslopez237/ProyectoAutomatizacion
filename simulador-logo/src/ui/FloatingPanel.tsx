import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode, type RefObject } from 'react'
import { PanelHead } from './PanelHead'

// proporción del dibujo del proceso (viewBox 1000 x 420) y alto de la barra de título + bordes
const RATIO = 1000 / 420
const HEAD_H = 33
const MIN_W = 280
const BOX_KEY = 'simulador-logo/sim-ventana'

type Box = { x: number; y: number; w: number }
type Corner = 'nw' | 'ne' | 'sw' | 'se'
const CORNERS: { c: Corner; label: string }[] = [
  { c: 'nw', label: 'superior izquierda' },
  { c: 'ne', label: 'superior derecha' },
  { c: 'sw', label: 'inferior izquierda' },
  { c: 'se', label: 'inferior derecha' },
]

const heightOf = (w: number) => w / RATIO + HEAD_H

const boardSize = (ref: RefObject<HTMLElement | null>) => ({
  w: ref.current?.clientWidth ?? window.innerWidth,
  h: ref.current?.clientHeight ?? window.innerHeight,
})

/** mantiene la ventana dentro del tablero (achicándola si hace falta) */
function fitBox(b: Box, bd: { w: number; h: number }): Box {
  const w = Math.round(Math.max(MIN_W, Math.min(b.w, bd.w - 8, (bd.h - 8 - HEAD_H) * RATIO)))
  const h = heightOf(w)
  return { w, x: Math.round(Math.min(Math.max(0, b.x), Math.max(0, bd.w - w))), y: Math.round(Math.min(Math.max(0, b.y), Math.max(0, bd.h - h))) }
}

function loadBox(): Box | null {
  try {
    const b = JSON.parse(localStorage.getItem(BOX_KEY) ?? '')
    if ([b?.x, b?.y, b?.w].every((v) => typeof v === 'number') && b.w >= MIN_W) return b
  } catch {
    // sin datos guardados: arranca abajo a la derecha
  }
  return null
}

/** Ventana con proporción fija que se mueve arrastrando la barra y se redimensiona desde cualquier esquina. */
export function FloatingPanel({
  title,
  boardRef,
  onExpand,
  onClose,
  children,
}: {
  title: string
  boardRef: RefObject<HTMLElement | null>
  onExpand: () => void
  onClose: () => void
  children: ReactNode
}) {
  // null = todavía no se movió: queda anclada abajo a la derecha
  const [box, setBox] = useState<Box | null>(loadBox)
  const ref = useRef<HTMLElement>(null)

  const board = () => boardSize(boardRef)
  const current = (): Box & { h: number } => {
    const el = ref.current!
    return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
  }

  useEffect(() => {
    try {
      if (box) localStorage.setItem(BOX_KEY, JSON.stringify(box))
    } catch {
      // sin almacenamiento: la posición no se recuerda
    }
  }, [box])

  // si el tablero cambia de tamaño (ventana del navegador, paneles), la simulación no queda afuera
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox((b) => (b ? fitBox(b, boardSize(boardRef)) : b)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [boardRef])

  const drag = (e: RPointerEvent<HTMLElement>, onMove: (dx: number, dy: number) => void) => {
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const sx = e.clientX
    const sy = e.clientY
    const move = (ev: PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy)
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  const startMove = (e: RPointerEvent<HTMLElement>) => {
    const r = current()
    drag(e, (dx, dy) => setBox(fitBox({ x: r.x + dx, y: r.y + dy, w: r.w }, board())))
  }

  /** nuevo tamaño con la esquina opuesta quieta */
  const resized = (r: Box & { h: number }, c: Corner, dw: number): Box => {
    const bd = board()
    const west = c.includes('w')
    const north = c.includes('n')
    const roomW = west ? r.x + r.w : bd.w - r.x
    const roomH = north ? r.y + r.h : bd.h - r.y
    const max = Math.max(MIN_W, Math.min(roomW, (roomH - HEAD_H) * RATIO))
    const w = Math.round(Math.min(max, Math.max(MIN_W, r.w + dw)))
    const h = heightOf(w)
    return { w, x: west ? r.x + r.w - w : r.x, y: north ? r.y + r.h - h : r.y }
  }

  const startResize = (e: RPointerEvent<HTMLElement>, c: Corner) => {
    e.stopPropagation()
    const r = current()
    drag(e, (dx, dy) => {
      const gx = c.includes('w') ? -dx : dx
      const gy = (c.includes('n') ? -dy : dy) * RATIO
      setBox(resized(r, c, Math.abs(gx) > Math.abs(gy) ? gx : gy))
    })
  }

  const style: CSSProperties = box ? { left: box.x, top: box.y, right: 'auto', bottom: 'auto', width: box.w } : { width: 460 }

  return (
    <section ref={ref} className="panel panel-sketch sim-float" aria-label={title} style={style}>
      {CORNERS.map(({ c, label }) => (
        <div
          key={c}
          className={`sim-grip sim-grip-${c}`}
          role="slider"
          aria-label={`Tamaño de la simulación (esquina ${label})`}
          aria-valuenow={box?.w ?? 460}
          aria-valuemin={MIN_W}
          tabIndex={0}
          title="Arrastrá para agrandar o achicar"
          onPointerDown={(e) => startResize(e, c)}
          onKeyDown={(e) => {
            const grow = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? 40 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? -40 : 0
            if (grow) setBox(resized(current(), c, grow))
          }}
        />
      ))}
      <PanelHead title={title} expanded={false} onExpand={onExpand} onClose={onClose} onDragStart={startMove} />
      {children}
    </section>
  )
}

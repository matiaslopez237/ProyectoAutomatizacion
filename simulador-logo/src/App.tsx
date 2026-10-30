import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas } from './editor/Canvas'
import { FupView } from './editor/FupView'
import { InfoWindow } from './editor/InfoWindow'
import { Palette } from './editor/Palette'
import { PropertiesDialog } from './editor/PropertiesDialog'
import { Toolbar } from './editor/Toolbar'
import { startRuntime } from './sim/runtime'
import { useStore } from './store'
import { DocsDialog } from './ui/DocsDialog'
import { EnvPanel } from './ui/EnvPanel'
import { FileDialog } from './ui/FileDialog'
import { FloatingPanel } from './ui/FloatingPanel'
import { PanelHead } from './ui/PanelHead'
import { SketchPanel } from './ui/SketchPanel'
import { programFile } from './ui/programFile'
import { DocTab, StatusBar } from './ui/StatusBar'
import { ThemeToggle } from './ui/ThemeToggle'

/** Paneles que se abren y cierran desde la barra. Ladder y Bloques comparten el centro: se ve uno a la vez. */
type PanelId = 'sliders' | 'ladder' | 'bloques' | 'sim'
type Center = 'ladder' | 'bloques' | null
type Panels = { sliders: boolean; center: Center; sim: boolean }

const PANEL_BUTTONS: { id: PanelId; label: string }[] = [
  { id: 'sliders', label: 'Sliders' },
  { id: 'ladder', label: 'Ladder' },
  { id: 'bloques', label: 'Bloques' },
  { id: 'sim', label: 'Sim. en vivo' },
]

const PANELS_KEY = 'simulador-logo/paneles'
const DEFAULT_PANELS: Panels = { sliders: true, center: 'ladder', sim: true }

function loadPanels(): Panels {
  try {
    const p = JSON.parse(localStorage.getItem(PANELS_KEY) ?? '')
    if (typeof p?.sliders === 'boolean' && typeof p?.sim === 'boolean' && ['ladder', 'bloques', null].includes(p?.center)) return p
  } catch {
    // sin datos guardados (o almacenamiento bloqueado): arranca con todo abierto
  }
  return DEFAULT_PANELS
}

const isOpen = (p: Panels, id: PanelId) => (id === 'sliders' ? p.sliders : id === 'sim' ? p.sim : p.center === id)

function toggle(p: Panels, id: PanelId): Panels {
  if (id === 'sliders') return { ...p, sliders: !p.sliders }
  if (id === 'sim') return { ...p, sim: !p.sim }
  return { ...p, center: p.center === id ? null : id }
}

/** Separador arrastrable. Vertical mueve en x (paneles lado a lado); horizontal mueve en y (panel de abajo). */
function Resizer({ onDrag, label, horizontal = false }: { onDrag: (d: number) => void; label: string; horizontal?: boolean }) {
  return (
    <div
      className={horizontal ? 'resizer resizer-h' : 'resizer'}
      role="separator"
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === (horizontal ? 'ArrowUp' : 'ArrowLeft')) onDrag(-20)
        if (e.key === (horizontal ? 'ArrowDown' : 'ArrowRight')) onDrag(20)
      }}
      onPointerDown={(e) => {
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        let last = horizontal ? e.clientY : e.clientX
        const move = (ev: PointerEvent) => {
          const now = horizontal ? ev.clientY : ev.clientX
          onDrag(now - last)
          last = now
        }
        const up = () => {
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerup', up)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerup', up)
      }}
    />
  )
}

export default function App() {
  const running = useStore((s) => s.running)
  const speed = useStore((s) => s.speed)
  const scenarioId = useStore((s) => s.scenarioId)
  const { setRunning, setSpeed, resetProcess } = useStore.getState()
  const [panels, setPanels] = useState(loadPanels)
  // panel maximizado dentro de la ventana (tapa a los demás); null = tablero normal
  const [expanded, setExpanded] = useState<PanelId | null>(null)
  const [left, setLeft] = useState(290)
  const [ladderMenu, setLadderMenu] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const [fileOpen, setFileOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)

  useEffect(() => startRuntime(), [])

  useEffect(() => {
    try {
      localStorage.setItem(PANELS_KEY, JSON.stringify(panels))
    } catch {
      // sin almacenamiento: el estado de los paneles no se recuerda, nada más
    }
  }, [panels])

  // el proceso lo maneja el programa que está a la vista en el centro (con el centro vacío, el último que se vio)
  useEffect(() => {
    if (panels.center) useStore.getState().setProgram(panels.center === 'bloques' ? 'fup' : 'ladder')
  }, [panels.center])

  // un panel cerrado no puede quedar maximizado
  const shownExpanded = expanded && isOpen(panels, expanded) ? expanded : null

  useEffect(() => {
    if (!shownExpanded) return
    const onKey = (e: KeyboardEvent) => {
      // Esc del editor cancela la colocación de un bloque: solo achica si no hay nada armado
      if (e.key === 'Escape' && !useStore.getState().armed && !document.querySelector('dialog[open]')) setExpanded(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shownExpanded])

  const close = (id: PanelId) => setPanels((p) => (isOpen(p, id) ? toggle(p, id) : p))
  const expandToggle = (id: PanelId) => setExpanded((e) => (e === id ? null : id))

  const panel = (id: PanelId, title: string, className: string, body: ReactNode, canExpand = true) => (
    <section className={`panel ${className}`} aria-label={title}>
      <PanelHead
        title={title}
        expanded={shownExpanded === id}
        onExpand={canExpand ? () => expandToggle(id) : undefined}
        onClose={() => close(id)}
      />
      {body}
    </section>
  )

  const sliders = panel('sliders', 'Sliders', 'panel-env', <EnvPanel />, false)
  const ladder = panel(
    'ladder',
    'Ladder',
    'panel-editor',
    <>
      <Toolbar onFile={() => setFileOpen(true)} menuOpen={ladderMenu} onMenu={() => setLadderMenu(!ladderMenu)} />
      <DocTab file={programFile(scenarioId, 'ladder')} />
      <div className={`editor-body${ladderMenu ? '' : ' no-menu'}`}>
        {ladderMenu && (
          <div className="ladder-menu" id="ladder-menu">
            <Palette />
            <InfoWindow />
          </div>
        )}
        <Canvas />
      </div>
    </>,
  )
  const bloques = panel('bloques', 'Bloques', 'panel-fup', <FupView />)
  const simExpanded = shownExpanded === 'sim'
  // expandida ocupa todo el tablero; si no, es una ventana flotante que se mueve y se redimensiona
  const sim = simExpanded ? (
    panel('sim', 'Sim. en vivo', 'panel-sketch', <SketchPanel expanded />)
  ) : (
    <FloatingPanel title="Sim. en vivo" boardRef={mainRef} onExpand={() => expandToggle('sim')} onClose={() => close('sim')}>
      <SketchPanel />
    </FloatingPanel>
  )
  const byId: Record<PanelId, ReactNode> = { sliders, ladder, bloques, sim }

  const center = panels.center === 'ladder' ? ladder : panels.center === 'bloques' ? bloques : null
  const top = panels.sliders || center
  const anyOpen = top || panels.sim

  let content: ReactNode
  if (shownExpanded) {
    content = <main className="expanded">{byId[shownExpanded]}</main>
  } else if (!anyOpen) {
    content = (
      <main className="all-closed">
        <p>Todos los paneles están cerrados. Abrí Sliders, Ladder, Bloques o Sim. en vivo desde la barra de arriba.</p>
      </main>
    )
  } else {
    // sliders y el panel del centro lado a lado; la simulación flota encima
    content = (
      <main className="board" ref={mainRef}>
        {top ? (
          <div
            className="cols"
            style={{ gridTemplateColumns: panels.sliders && center ? `${left}px 6px minmax(360px, 1fr)` : center ? '1fr' : `${left}px 1fr` }}
          >
            {panels.sliders && sliders}
            {panels.sliders && center && (
              <Resizer label="Ancho del panel de sliders" onDrag={(dx) => setLeft((w) => Math.min(460, Math.max(220, w + dx)))} />
            )}
            {center}
            {panels.sliders && !center && (
              <div className="panel-empty">
                <p>Abrí Ladder o Bloques desde la barra para ver el programa.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="panel-empty">
            <p>Abrí Sliders, Ladder o Bloques desde la barra de arriba.</p>
          </div>
        )}
        {panels.sim && sim}
      </main>
    )
  }

  return (
    <div className="app">
      <header className="appbar">
        <h1 className="brand">Simulador LOGO! · Invernadero automatizado</h1>
        <button type="button" className="btn btn-ghost" onClick={() => setDocsOpen(true)}>
          Conexiones y E/S
        </button>
        <nav className="panel-toggles" aria-label="Paneles">
          {PANEL_BUTTONS.map((b) => (
            <button
              key={b.id}
              type="button"
              className="panel-toggle"
              aria-pressed={isOpen(panels, b.id)}
              onClick={() => {
                setPanels((p) => toggle(p, b.id))
                setExpanded(null)
              }}
            >
              {b.label}
            </button>
          ))}
        </nav>
        <div className="appbar-run">
          <button type="button" className={`run ${running ? 'is-run' : 'is-stop'}`} onClick={() => setRunning(!running)} aria-pressed={running}>
            <span className="run-led" aria-hidden="true" />
            {running ? 'RUN' : 'STOP'}
          </button>
          <label className="appbar-field">
            <span>Velocidad</span>
            <select id="speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {[1, 5, 20, 60, 300].map((v) => (
                <option key={v} value={v}>
                  ×{v}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-ghost" onClick={resetProcess} title="Vuelve el proceso a las condiciones iniciales">
            Reiniciar proceso
          </button>
          <ThemeToggle />
        </div>
      </header>

      {content}

      <StatusBar />

      <PropertiesDialog />
      <FileDialog open={fileOpen} onClose={() => setFileOpen(false)} />
      <DocsDialog open={docsOpen} onClose={() => setDocsOpen(false)} />
    </div>
  )
}

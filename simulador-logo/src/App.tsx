import { useEffect, useState } from 'react'
import { Canvas } from './editor/Canvas'
import { InfoWindow } from './editor/InfoWindow'
import { Palette } from './editor/Palette'
import { PropertiesDialog } from './editor/PropertiesDialog'
import { Toolbar } from './editor/Toolbar'
import { SCENARIOS } from './scenarios'
import { startRuntime } from './sim/runtime'
import { useStore } from './store'
import { DocsDialog } from './ui/DocsDialog'
import { EnvPanel } from './ui/EnvPanel'
import { FileDialog } from './ui/FileDialog'
import { SketchPanel } from './ui/SketchPanel'

type Tab = 'entorno' | 'programa' | 'proceso'
const TABS: { id: Tab; label: string }[] = [
  { id: 'entorno', label: 'Entorno' },
  { id: 'programa', label: 'Programa KOP' },
  { id: 'proceso', label: 'Proceso' },
]

function useNarrow() {
  const q = '(max-width: 980px)'
  const [narrow, setNarrow] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setNarrow(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return narrow
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
  const { setRunning, setSpeed, setScenario, resetProcess } = useStore.getState()
  const narrow = useNarrow()
  const [tab, setTab] = useState<Tab>('programa')
  const [left, setLeft] = useState(290)
  // alto del panel del proceso: arranca en la mitad de la pantalla; el botón lo lleva al máximo y lo vuelve
  const defaultBottom = () => Math.round(Math.max(260, window.innerHeight * 0.5))
  const maxBottom = () => Math.max(260, window.innerHeight - 290)
  const [bottom, setBottom] = useState(defaultBottom)
  const expanded = bottom >= maxBottom() - 10
  const [fileOpen, setFileOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)

  useEffect(() => startRuntime(), [])

  const env = (
    <section className="panel panel-env" aria-label="Entorno">
      <EnvPanel />
    </section>
  )
  const editor = (
    <section className="panel panel-editor" aria-label="Programa KOP">
      <Toolbar onFile={() => setFileOpen(true)} />
      <div className="editor-body">
        <Palette />
        <Canvas />
      </div>
      <InfoWindow />
    </section>
  )
  const process = (
    <section className="panel panel-sketch" aria-label="Proceso">
      {!narrow && (
        <button type="button" className="btn btn-small sketch-size" onClick={() => setBottom(expanded ? defaultBottom() : maxBottom())} aria-pressed={expanded}>
          {expanded ? '⤡ Achicar' : '⤢ Agrandar'}
        </button>
      )}
      <SketchPanel />
    </section>
  )

  return (
    <div className="app">
      <header className="appbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            KOP
          </span>
          <h1>Simulador LOGO!</h1>
        </div>
        <label className="appbar-field">
          <span>Escenario</span>
          <select id="scenario" value={scenarioId} onChange={(e) => setScenario(e.target.value)}>
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => setDocsOpen(true)}>
          Conexiones y E/S
        </button>
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
        </div>
      </header>

      {narrow ? (
        <>
          <nav className="tabs" role="tablist" aria-label="Secciones">
            {TABS.map((t) => (
              <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          <main className="stack">
            {tab === 'entorno' && env}
            {tab === 'programa' && editor}
            {tab === 'proceso' && process}
          </main>
        </>
      ) : (
        // arriba: entorno y programa lado a lado; abajo: el proceso a todo el ancho
        <main className="rows" style={{ gridTemplateRows: `minmax(220px, 1fr) 6px ${bottom}px` }}>
          <div className="cols" style={{ gridTemplateColumns: `${left}px 6px minmax(360px, 1fr)` }}>
            {env}
            <Resizer label="Ancho del panel de entorno" onDrag={(dx) => setLeft((w) => Math.min(460, Math.max(220, w + dx)))} />
            {editor}
          </div>
          <Resizer
            horizontal
            label="Alto del panel del proceso"
            onDrag={(dy) => setBottom((h) => Math.min(maxBottom(), Math.max(160, h - dy)))}
          />
          {process}
        </main>
      )}

      <PropertiesDialog />
      <FileDialog open={fileOpen} onClose={() => setFileOpen(false)} />
      <DocsDialog open={docsOpen} onClose={() => setDocsOpen(false)} />
    </div>
  )
}

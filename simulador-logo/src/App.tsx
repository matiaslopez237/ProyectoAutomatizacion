import { useEffect, useState } from 'react'
import { Canvas } from './editor/Canvas'
import { InfoWindow } from './editor/InfoWindow'
import { Palette } from './editor/Palette'
import { PropertiesDialog } from './editor/PropertiesDialog'
import { Toolbar } from './editor/Toolbar'
import { SCENARIOS } from './scenarios'
import { startRuntime } from './sim/runtime'
import { useStore } from './store'
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

function Resizer({ onDrag, label }: { onDrag: (dx: number) => void; label: string }) {
  return (
    <div
      className="resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onDrag(-20)
        if (e.key === 'ArrowRight') onDrag(20)
      }}
      onPointerDown={(e) => {
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        let last = e.clientX
        const move = (ev: PointerEvent) => {
          onDrag(ev.clientX - last)
          last = ev.clientX
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
  const [right, setRight] = useState(440)
  const [fileOpen, setFileOpen] = useState(false)

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
        <main className="cols" style={{ gridTemplateColumns: `${left}px 6px minmax(360px, 1fr) 6px ${right}px` }}>
          {env}
          <Resizer label="Ancho del panel de entorno" onDrag={(dx) => setLeft((w) => Math.min(460, Math.max(220, w + dx)))} />
          {editor}
          <Resizer label="Ancho del panel del proceso" onDrag={(dx) => setRight((w) => Math.min(760, Math.max(300, w - dx)))} />
          {process}
        </main>
      )}

      <PropertiesDialog />
      <FileDialog open={fileOpen} onClose={() => setFileOpen(false)} />
    </div>
  )
}

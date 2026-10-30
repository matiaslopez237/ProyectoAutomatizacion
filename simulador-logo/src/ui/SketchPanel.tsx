import { useState } from 'react'
import { getScenario } from '../scenarios'
import { selectOutputs, useStore } from '../store'
import { DigitalInputs, EnvSliders, OutputLeds, SensorList } from './EnvPanel'

/**
 * La animación del proceso con el tiempo simulado encima.
 * Expandida, suma a la izquierda un menú plegable para tocar entradas y entorno sin abrir los otros paneles.
 */
export function SketchPanel({ expanded = false }: { expanded?: boolean }) {
  const scenarioId = useStore((s) => s.scenarioId)
  const phys = useStore((s) => s.sim.phys)
  const outputs = useStore(selectOutputs)
  const params = useStore((s) => s.params)
  const digital = useStore((s) => s.digital)
  const t = useStore((s) => s.sim.t)
  const [menuOpen, setMenuOpen] = useState(true)
  const sc = getScenario(scenarioId)
  const Sketch = sc.Sketch
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)

  return (
    <div className={`sketch${expanded ? ' is-expanded' : ''}`}>
      {expanded && (
        <aside className={`sim-menu${menuOpen ? '' : ' is-closed'}`} aria-label="Controles de la simulación">
          <button type="button" className="sim-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="sim-menu-body">
            {menuOpen ? '◂ Ocultar controles' : '▸'}
            {!menuOpen && <span className="sr-only">Mostrar controles</span>}
          </button>
          {menuOpen && (
            <div className="sim-menu-body" id="sim-menu-body">
              <section>
                <h3>Entradas</h3>
                <DigitalInputs />
              </section>
              <section>
                <h3>Entorno</h3>
                <EnvSliders />
              </section>
              <section>
                <h3>Sensores</h3>
                <SensorList compact />
              </section>
              <section>
                <h3>Salidas</h3>
                <OutputLeds />
              </section>
            </div>
          )}
        </aside>
      )}
      <div className="sketch-stage">
        <Sketch state={phys} outputs={outputs ?? {}} params={params} digital={digital} />
        <span className="sim-clock" title="Tiempo simulado desde el último reinicio">
          ⏱ {h} h {String(m).padStart(2, '0')} min
        </span>
      </div>
    </div>
  )
}

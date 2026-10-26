import { getScenario } from '../scenarios'
import { useStore } from '../store'

export function SketchPanel() {
  const scenarioId = useStore((s) => s.scenarioId)
  const phys = useStore((s) => s.sim.phys)
  const outputs = useStore((s) => s.sim.result?.outputs)
  const params = useStore((s) => s.params)
  const digital = useStore((s) => s.digital)
  const t = useStore((s) => s.sim.t)
  const sc = getScenario(scenarioId)
  const Sketch = sc.Sketch
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)

  return (
    <div className="sketch">
      <Sketch state={phys} outputs={outputs ?? {}} params={params} digital={digital} />
      <p className="sketch-note">
        {sc.summary} Tiempo simulado: {h} h {String(m).padStart(2, '0')} min.
      </p>
    </div>
  )
}

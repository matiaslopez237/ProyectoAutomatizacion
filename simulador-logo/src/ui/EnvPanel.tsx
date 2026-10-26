import { getScenario } from '../scenarios'
import type { SensorDef } from '../scenarios/types'
import { useStore } from '../store'

const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',')

function Sparkline({ data, min, max }: { data: number[]; min: number; max: number }) {
  const W = 120
  const H = 28
  if (data.length < 2) return <svg className="spark" width={W} height={H} aria-hidden="true" />
  const x = (i: number) => (i / (data.length - 1)) * W
  const y = (v: number) => H - 2 - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (H - 4)
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const last = data[data.length - 1]
  return (
    <svg className="spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} className="spark-grid" />
      <path d={`${line} L${W} ${H} L0 ${H} Z`} className="spark-area" />
      <path d={line} className="spark-line" />
      <circle cx={W} cy={y(last)} r="2.5" className="spark-dot" />
    </svg>
  )
}

function SensorRow({ s }: { s: SensorDef<unknown> }) {
  const phys = useStore((st) => st.sim.phys)
  const params = useStore((st) => st.params)
  const hist = useStore((st) => st.sim.history[s.op])
  const v = s.read(phys, params)
  const raw = Math.min(1000, Math.max(0, Math.round(v * s.scale)))
  return (
    <li className="sensor">
      <div className="sensor-head">
        <span className="op">{s.op}</span>
        <span className="sensor-label">{s.label}</span>
      </div>
      <div className="sensor-body">
        <span className="sensor-value">
          {fmt(v)} <small>{s.unit}</small>
        </span>
        <Sparkline data={hist ?? []} min={s.min} max={s.max} />
      </div>
      <div className="sensor-raw">LOGO! lee {raw} de 1000</div>
    </li>
  )
}

export function EnvPanel() {
  const scenarioId = useStore((s) => s.scenarioId)
  const params = useStore((s) => s.params)
  const digital = useStore((s) => s.digital)
  const outputs = useStore((s) => s.sim.result?.outputs)
  const sc = getScenario(scenarioId)
  const { setParam, setDigital } = useStore.getState()

  return (
    <div className="env">
      <section className="env-sec">
        <h3>Entorno</h3>
        {sc.sliders.map((sl) => (
          <div className="slider" key={sl.key}>
            <label htmlFor={`sl-${sl.key}`}>
              <span>{sl.label}</span>
              <output htmlFor={`sl-${sl.key}`}>
                {fmt(params[sl.key], sl.step < 1 ? 1 : 0)} {sl.unit}
              </output>
            </label>
            <input
              id={`sl-${sl.key}`}
              type="range"
              min={sl.min}
              max={sl.max}
              step={sl.step}
              value={params[sl.key]}
              onChange={(e) => setParam(sl.key, Number(e.target.value))}
            />
          </div>
        ))}
      </section>

      <section className="env-sec">
        <h3>Entradas digitales</h3>
        <ul className="inputs">
          {sc.digital.map((d) => (
            <li key={d.op}>
              {d.kind === 'switch' ? (
                <label className="switch">
                  <input id={`in-${d.op}`} type="checkbox" checked={!!digital[d.op]} onChange={(e) => setDigital(d.op, e.target.checked)} />
                  <span className="switch-track" aria-hidden="true" />
                  <span className="op">{d.op}</span>
                  <span className="in-label">
                    {d.label}
                    {d.hint && <small>{d.hint}</small>}
                  </span>
                </label>
              ) : (
                <div className="switch">
                  <button
                    id={`in-${d.op}`}
                    type="button"
                    className={`push${digital[d.op] ? ' is-down' : ''}`}
                    aria-pressed={!!digital[d.op]}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      setDigital(d.op, true)
                    }}
                    onPointerUp={() => setDigital(d.op, false)}
                    onPointerCancel={() => setDigital(d.op, false)}
                    onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setDigital(d.op, true)}
                    onKeyUp={() => setDigital(d.op, false)}
                  >
                    <span className="sr-only">{d.label}</span>
                  </button>
                  <span className="op">{d.op}</span>
                  <span className="in-label">
                    {d.label}
                    {d.hint && <small>{d.hint}</small>}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="env-sec">
        <h3>Sensores analógicos</h3>
        <ul className="sensors">
          {sc.sensors.map((s) => (
            <SensorRow key={s.op} s={s} />
          ))}
        </ul>
      </section>

      <section className="env-sec">
        <h3>Salidas</h3>
        <ul className="outputs">
          {sc.outputs.map((o) => (
            <li key={o.op} className={outputs?.[o.op] ? 'is-on' : ''}>
              <span className="led" aria-hidden="true" />
              <span className="op">{o.op}</span>
              <span>{o.label}</span>
              <span className="sr-only">{outputs?.[o.op] ? 'encendida' : 'apagada'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

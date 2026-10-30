import { memo, useMemo, useState } from 'react'
import type { FupBlock, FupKind, FupProgram, FupResult } from '../plc/fup'
import { getScenario } from '../scenarios'
import { useStore } from '../store'

const LINE = 14 // alto de renglón del texto de parámetros en LOGO!Soft

const SYMBOL: Partial<Record<FupKind, string>> = {
  Input: 'I',
  AnalogInput: 'AI',
  Output: 'Q',
  And: '&',
  Or: '≥1',
  Not: '1',
  LatchingRelay: 'RS',
  Counter: '+/−',
  AnalogTrigger: 'A↗',
}

const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',')

/** Rectángulo amarillo del bloque, a partir de las patas exportadas de LOGO!Soft. */
function body(b: FupBlock) {
  const ys = [...b.inputs.map((i) => i.box?.[1]), b.out?.[1]].filter((y): y is number => y !== undefined)
  const left = b.inputs[0]?.box ? b.inputs[0].box[0] + 6 : b.out ? b.out[0] - 24 : b.box[0]
  const right = b.out ? b.out[0] : left + 24
  const mid = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : b.box[1] + 30
  const top = ys.length > 1 ? Math.min(Math.min(...ys) - 6, mid - 15) : mid - 15
  const bottom = ys.length > 1 ? Math.max(Math.max(...ys) + 6, mid + 15) : mid + 15
  return { left, right, top, bottom, mid }
}

/** Ícono de los temporizadores y del reloj, centrado en (cx, cy). */
function TimerIcon({ kind, cx, cy }: { kind: FupKind; cx: number; cy: number }) {
  if (kind === 'Clock') {
    return (
      <g className="fup-ink">
        <circle cx={cx} cy={cy} r={6} />
        <path d={`M${cx} ${cy - 4} V${cy} H${cx + 3}`} />
      </g>
    )
  }
  // retardo a la conexión: sube tarde; a la desconexión: baja tarde
  const d = kind === 'OnDelay' ? `M${cx - 9} ${cy + 5} H${cx - 1} V${cy - 5} H${cx + 9}` : `M${cx - 9} ${cy + 5} H${cx - 6} V${cy - 5} H${cx + 4} V${cy + 5} H${cx + 9}`
  return <path className="fup-ink" d={d} />
}

function liveLine(b: FupBlock, res: FupResult | null): string | null {
  if (!res) return null
  const fb = res.state.fb[b.id]
  if (b.kind === 'OnDelay' || b.kind === 'OffDelay') return `T = ${fmt(fb?.t ?? 0)} s`
  if (b.kind === 'Counter') return `Cnt = ${fb?.count ?? 0}`
  if (b.kind === 'AnalogTrigger') return `Ax = ${fmt(res.ana[b.id] ?? 0)}`
  return null
}

const FupBlockView = memo(function FupBlockView({ b, on, live }: { b: FupBlock; on: boolean; live: string | null }) {
  const g = body(b)
  const title = b.name ? `${b.id} (${b.name})` : b.id
  const lines = b.paramText ? b.paramText.split('\n') : []
  const timer = b.kind === 'OnDelay' || b.kind === 'OffDelay' || b.kind === 'Clock'
  return (
    <g className={`fup-block${on ? ' is-on' : ''}`}>
      <title>{title}</title>
      <text className="fup-id" x={g.left} y={g.top - 4}>
        {title}
      </text>
      {b.inputs.map((inp, i) =>
        inp.box ? (
          <g key={i}>
            <line className="fup-stub" x1={inp.box[0]} y1={inp.box[1]} x2={inp.box[0] + 6} y2={inp.box[1]} />
            {inp.neg && <circle className="fup-neg" cx={inp.box[0] + 3} cy={inp.box[1]} r={2.6} />}
          </g>
        ) : null,
      )}
      {b.out && <line className="fup-stub" x1={b.out[0]} y1={b.out[1]} x2={b.out[0] + 6} y2={b.out[1]} />}
      <rect className="fup-body" x={g.left} y={g.top} width={g.right - g.left} height={g.bottom - g.top} />
      {timer ? (
        <TimerIcon kind={b.kind} cx={(g.left + g.right) / 2} cy={g.mid} />
      ) : (
        <text className="fup-sym" x={(g.left + g.right) / 2} y={g.mid + 4} textAnchor="middle">
          {SYMBOL[b.kind]}
        </text>
      )}
      {b.paramBox && (
        <text className="kop-param">
          {lines.map((l, i) => (
            <tspan key={i} x={b.paramBox![0]} y={b.paramBox![1] + 10 + LINE * i}>
              {l}
            </tspan>
          ))}
          {live && (
            <tspan className="fup-live" x={b.paramBox[0]} y={b.paramBox[1] + 10 + LINE * lines.length}>
              {live}
            </tspan>
          )}
        </text>
      )}
    </g>
  )
})

function FupDrawing({ prog, res, zoom }: { prog: FupProgram; res: FupResult | null; zoom: number }) {
  const kinds = useMemo(() => new Map(prog.blocks.map((b) => [b.id, b.kind])), [prog])
  // recorte al contenido: LOGO!Soft deja margen libre arriba y a la izquierda de la hoja
  const view = useMemo(() => {
    let x0 = Infinity
    let y0 = Infinity
    let x1 = 0
    let y1 = 0
    for (const b of prog.blocks) {
      x0 = Math.min(x0, b.box[0], b.paramBox?.[0] ?? Infinity)
      y0 = Math.min(y0, b.box[1])
      x1 = Math.max(x1, b.box[0] + b.box[2])
      y1 = Math.max(y1, b.box[1] + b.box[3])
    }
    for (const c of prog.comments) {
      x0 = Math.min(x0, c.x)
      y0 = Math.min(y0, c.y)
      x1 = Math.max(x1, c.x + 6.5 * c.text.length)
      y1 = Math.max(y1, c.y + 14)
    }
    return { x: x0 - 30, y: y0 - 30, w: x1 - x0 + 60, h: y1 - y0 + 60 }
  }, [prog])
  // puntos de derivación: quiebres que comparten dos o más cables que salen del mismo bloque
  const dots = useMemo(() => {
    const count = new Map<string, number>()
    for (const w of prog.wires) {
      const seen = new Set(w.points.slice(1).map(([x, y]) => `${w.from}:${x}:${y}`))
      for (const k of seen) count.set(k, (count.get(k) ?? 0) + 1)
    }
    return [...count].filter(([, n]) => n > 1).map(([k]) => {
      const [from, x, y] = k.split(':')
      return { from, x: Number(x), y: Number(y) }
    })
  }, [prog])

  const val = (id: string) => !!res?.values[id]
  return (
    <svg
      className="fup-svg"
      width={view.w * zoom}
      height={view.h * zoom}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      role="img"
      aria-label={`Programa FUP de ${prog.source}`}
    >
      <defs>
        <pattern id="fup-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle className="fup-griddot" cx="0.5" cy="0.5" r="0.7" />
        </pattern>
      </defs>
      <rect x={view.x} y={view.y} width={view.w} height={view.h} className="fup-bg" />
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#fup-grid)" />
      {prog.wires.map((w, i) => {
        const analog = kinds.get(w.from) === 'AnalogInput'
        return (
          <polyline
            key={i}
            className={`fup-wire${analog ? ' is-analog' : val(w.from) ? ' is-live' : ''}`}
            points={w.points.map((p) => p.join(',')).join(' ')}
          />
        )
      })}
      {dots.map((d, i) => (
        <circle key={i} className={`fup-dot${val(d.from) ? ' is-live' : ''}`} cx={d.x} cy={d.y} r={2.6} />
      ))}
      {prog.blocks.map((b) => (
        <FupBlockView key={b.id} b={b} on={b.kind !== 'AnalogInput' && val(b.id)} live={liveLine(b, res)} />
      ))}
      {prog.comments.map((c, i) => (
        <text key={i} className="kop-comment fup-comment" x={c.x} y={c.y + 11}>
          {c.text}
        </text>
      ))}
    </svg>
  )
}

/** Vista "Bloques": el programa FUP exportado del .lsc. Solo se mira y se simula. */
export function FupView() {
  const scenarioId = useStore((s) => s.scenarioId)
  const res = useStore((s) => s.sim.fup)
  const prog = getScenario(scenarioId).fup
  const [zoom, setZoom] = useState(0.8)
  const z = (d: number) => setZoom((v) => Math.min(2, Math.max(0.3, Math.round((v + d) * 10) / 10)))

  if (!prog) {
    return (
      <div className="panel-empty">
        <p>Este escenario no tiene una versión FUP del programa.</p>
      </div>
    )
  }
  const file = prog.source.split('/').pop()
  return (
    <>
      <div className="toolbar" role="toolbar" aria-label="Vista de bloques">
        <button type="button" className="tb" onClick={() => z(-0.1)} title="Alejar" aria-label="Alejar">
          −
        </button>
        <span className="tb-zoom">{Math.round(zoom * 100)} %</span>
        <button type="button" className="tb" onClick={() => z(0.1)} title="Acercar" aria-label="Acercar">
          +
        </button>
        <span className="tb-sep" />
        <span className="tb-hint">
          <strong>{file}</strong> · solo lectura. Mientras esta vista está abierta, el proceso lo maneja este programa.
        </span>
      </div>
      <div className="fup-scroll" tabIndex={0} aria-label="Diagrama de bloques">
        <FupDrawing prog={prog} res={res} zoom={zoom} />
      </div>
    </>
  )
}

import type { SketchProps } from '../types'
import { daylight, SUNRISE, SUNSET, sunNow, type GreenhouseState } from './physics'
import './sketch.css'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const mix = (a: string, b: string, t: number) => {
  const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16))
  const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp01(t))).join(',')})`
}

const NOZZLES = [170, 250, 330, 410]
const PLANTS = [145, 210, 275, 340, 405]

function Tag({ x, y, op, label, on, anchor = 'start' }: { x: number; y: number; op: string; label: string; on: boolean; anchor?: 'start' | 'end' }) {
  const w = 14 + (op.length + label.length + 1) * 5.6
  const x0 = anchor === 'end' ? x - w : x
  return (
    <g className={`gh-tag${on ? ' is-on' : ''}`} transform={`translate(${x0} ${y})`}>
      <rect width={w} height={16} rx={3} />
      <circle cx={8} cy={8} r={3.5} />
      <text x={15} y={11.5}>
        <tspan className="gh-tag-op">{op}</tspan> {label}
      </text>
    </g>
  )
}

export function GreenhouseSketch({ state, outputs: q, params, digital }: SketchProps<GreenhouseState>) {
  const sun = sunNow(params) / 100
  const hour = params.hour ?? 13
  const day = daylight(hour)
  const rain = !!digital.I4
  // el sol recorre un arco de este a oeste entre la salida y la puesta; la luna hace lo mismo de noche
  const isDay = hour > SUNRISE && hour < SUNSET
  const nightLen = 24 - (SUNSET - SUNRISE)
  const arc = isDay ? (hour - SUNRISE) / (SUNSET - SUNRISE) : (((hour - SUNSET + 24) % 24) / nightLen)
  const bodyX = 30 + arc * 500
  const bodyY = 175 - Math.sin(Math.PI * arc) * 140
  const twilight = Math.max(0, 1 - Math.min(Math.abs(hour - SUNRISE), Math.abs(hour - SUNSET)) / 1.2)
  const hot = clamp01((state.temp - 26) / 18)
  const cold = clamp01((14 - state.temp) / 14)
  const wet = state.soil / 100
  const h = state.health
  const leaf = mix('a58a3c', '3f9b45', h)
  const roofY = (x: number) => 110 + (x - 280) * (80 / 210)

  return (
    <svg className="gh" viewBox="0 0 560 420" role="img" aria-label="Dibujo del invernadero con sus actuadores">
      <defs>
        <radialGradient id="gh-heat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff8a3d" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ff8a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gh-grow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c071ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c071ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* cielo y sol */}
      <rect width="560" height="420" fill={mix('101a30', rain ? '8ea3b5' : '9ed2ef', Math.min(1, day * 1.4))} />
      <rect width="560" height="200" fill="#ff9a52" opacity={twilight * 0.35} />
      {!isDay && (
        <g opacity={1 - twilight}>
          {Array.from({ length: 28 }, (_, i) => (
            <circle key={i} cx={(i * 97 + 13) % 560} cy={(i * 41 + 7) % 150} r={i % 3 ? 0.9 : 1.4} fill="#f4f1d8" />
          ))}
        </g>
      )}
      {isDay ? (
        <circle cx={bodyX} cy={bodyY} r="24" fill={mix('ff8c42', 'ffd75e', day)} opacity={rain ? 0.45 : 0.95} />
      ) : (
        <g transform={`translate(${bodyX} ${bodyY})`}>
          <circle r="15" fill="#e9ecf2" />
          <circle cx="7" cy="-4" r="13" fill={mix('101a30', '9ed2ef', day)} />
        </g>
      )}
      {rain && (
        <g className="gh-rain">
          {Array.from({ length: 36 }, (_, i) => (
            <line key={i} x1={(i * 37) % 560} y1={(i * 53) % 120} x2={((i * 37) % 560) - 4} y2={((i * 53) % 120) + 12} style={{ animationDelay: `${(i % 9) * -0.09}s` }} />
          ))}
        </g>
      )}

      {/* suelo exterior */}
      <rect y="360" width="560" height="60" fill="#5d4c39" />
      <rect y="356" width="560" height="6" fill="#6f8f3e" />

      {/* invernadero: vidrio con tinte según la temperatura interior */}
      <polygon points="70,360 70,190 280,110 490,190 490,360" fill="#dff1ff" opacity="0.22" />
      <polygon points="70,360 70,190 280,110 490,190 490,360" fill="#ff5a2a" opacity={hot * 0.3} />
      <polygon points="70,360 70,190 280,110 490,190 490,360" fill="#3a8dff" opacity={cold * 0.3} />

      {/* cantero y plantas */}
      <rect x="110" y="330" width="340" height="30" fill={mix('b08a5a', '3f2c20', wet)} />
      {PLANTS.map((x, i) => (
        <g key={x} transform={`translate(${x} 332) scale(${0.65 + 0.35 * h})`}>
          <path d="M0 0 C 1 -18, -1 -30, 0 -44" stroke="#4d6b2c" strokeWidth="3" fill="none" />
          {[-14, -26, -38].map((y, j) => (
            <g key={y} transform={`translate(0 ${y}) rotate(${(j % 2 ? 1 : -1) * (25 + (1 - h) * 45) + (i % 2) * 6})`}>
              <ellipse cx={j % 2 ? 9 : -9} cy="0" rx="10" ry="4.5" fill={leaf} />
            </g>
          ))}
        </g>
      ))}

      {/* luces de cultivo */}
      {[150, 280, 410].map((x) => (
        <g key={x}>
          {q.Q6 && <polygon points={`${x - 10},224 ${x + 10},224 ${x + 55},330 ${x - 55},330`} fill="url(#gh-grow)" />}
          <rect x={x - 14} y="218" width="28" height="6" rx="2" fill={q.Q6 ? '#e5c2ff' : '#3c4248'} />
        </g>
      ))}

      {/* cañería de riego y gotas */}
      <line x1="130" y1="202" x2="452" y2="202" stroke="#7d8a96" strokeWidth="5" strokeLinecap="round" />
      {NOZZLES.map((x, i) => (
        <g key={x}>
          <rect x={x - 3} y="203" width="6" height="7" fill="#5b6670" />
          {q.Q1 &&
            Array.from({ length: 6 }, (_, k) => (
              <circle key={k} className="gh-drop" cx={x + (k - 2.5) * 5} cy="212" r="2.2" style={{ animationDelay: `${(k * 0.13 + i * 0.07) % 0.8}s` }} />
            ))}
        </g>
      ))}

      {/* nebulizador */}
      {q.Q5 && (
        <g className="gh-mist">
          {[140, 220, 300, 380, 440].map((x, i) => (
            <ellipse key={x} cx={x} cy={240 + (i % 2) * 14} rx="42" ry="13" style={{ animationDelay: `${i * -0.7}s` }} />
          ))}
        </g>
      )}

      {/* estructura */}
      <g stroke="#e6edf1" strokeWidth="2" fill="none">
        {[140, 210, 280, 350, 420].map((x) => (
          <line key={x} x1={x} y1="360" x2={x} y2={x <= 280 ? 110 + (280 - x) * (80 / 210) : roofY(x)} />
        ))}
      </g>
      <polyline points="70,360 70,190 280,110 490,190 490,360" stroke="#f2f6f8" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <line x1="70" y1="190" x2="490" y2="190" stroke="#f2f6f8" strokeWidth="2" />

      {/* ventana cenital (bisagra arriba) */}
      <g transform={`rotate(${-38 * state.windowOpen} 330 ${roofY(330)})`} style={{ transition: 'transform .2s linear' }}>
        <line x1="330" y1={roofY(330)} x2="430" y2={roofY(430)} stroke="#f2f6f8" strokeWidth="7" strokeLinecap="round" />
        <line x1="330" y1={roofY(330)} x2="430" y2={roofY(430)} stroke="#a9d5ee" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* ventilador extractor */}
      <g transform="translate(100 245)">
        <circle r="22" fill="#38424b" stroke="#c9d3da" strokeWidth="2" />
        <g className={q.Q2 ? 'gh-spin' : undefined}>
          {[0, 120, 240].map((a) => (
            <ellipse key={a} rx="5" ry="16" cy="-9" fill="#c9d3da" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r="4" fill="#79858f" />
      </g>

      {/* calefactor */}
      <g transform="translate(95 318)">
        {q.Q3 && <ellipse cx="25" cy="10" rx="55" ry="34" fill="url(#gh-heat)" />}
        <rect width="50" height="26" rx="3" fill="#5a3a2a" />
        {[8, 18, 28, 38].map((x) => (
          <line key={x} x1={x + 2} y1="5" x2={x + 2} y2="21" stroke={q.Q3 ? '#ffb27a' : '#7d5947'} strokeWidth="3" />
        ))}
        {q.Q3 && (
          <g className="gh-heatwaves">
            {[10, 25, 40].map((x, i) => (
              <path key={x} d={`M${x} -4 q 5 -8 0 -16 q -5 -8 0 -16`} style={{ animationDelay: `${i * -0.4}s` }} />
            ))}
          </g>
        )}
      </g>

      {/* baliza de alarma */}
      <g transform="translate(280 106)">
        <rect x="-7" y="-2" width="14" height="5" fill="#2d3238" />
        <path d="M-7 -2 a7 9 0 0 1 14 0 z" className={q.Q7 ? 'gh-beacon is-on' : 'gh-beacon'} />
      </g>

      {/* etiquetas de salidas */}
      <Tag x={452} y={210} op="Q1" label="Aspersor" on={!!q.Q1} />
      <Tag x={128} y={232} op="Q2" label="Ventilador" on={!!q.Q2} />
      <Tag x={152} y={322} op="Q3" label="Calefactor" on={!!q.Q3} />
      <Tag x={442} y={132} op="Q4" label="Ventana" on={!!q.Q4} />
      <Tag x={452} y={252} op="Q5" label="Nebulizador" on={!!q.Q5} anchor="start" />
      <Tag x={262} y={226} op="Q6" label="Luces" on={!!q.Q6} anchor="end" />
      <Tag x={296} y={86} op="Q7" label="Alarma" on={!!q.Q7} />

      {/* lectura rápida */}
      <g className="gh-readout" transform="translate(12 12)">
        <rect width="210" height="72" rx="4" />
        <text x="10" y="20">
          {String(Math.floor(hour) % 24).padStart(2, '0')}:{String(Math.round((hour % 1) * 60) % 60).padStart(2, '0')} h · Sol {Math.round(sun * 100)} %
        </text>
        <text x="10" y="40">
          Interior {state.temp.toFixed(1).replace('.', ',')} °C · HR {Math.round(state.rh)} %
        </text>
        <text x="10" y="60">
          Suelo {Math.round(state.soil)} % · Plantas {Math.round(h * 100)} %
        </text>
      </g>
    </svg>
  )
}

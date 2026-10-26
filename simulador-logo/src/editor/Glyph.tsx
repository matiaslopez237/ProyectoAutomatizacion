import { BLOCK_DEFS } from '../plc/blockDefs'
import type { BlockType } from '../plc/types'

const FB_TEXT: Partial<Record<BlockType, string>> = {
  TON: 'TON',
  TOF: 'TOF',
  CTR: '+/−',
  RS: 'RS',
  ATRIG: 'A↗',
  ACMP: 'A−A',
}

/** Ícono amarillo del bloque, dibujado en coordenadas locales (0,0 = esquina del bloque). */
export function Glyph({ type, w, h, active }: { type: BlockType; w: number; h: number; active?: boolean }) {
  const cls = active ? 'kop-ink is-live' : 'kop-ink'
  const def = BLOCK_DEFS[type]

  if (def.fbPrefix) {
    return (
      <g>
        <rect className="kop-icon" x={6} y={17} width={w - 12} height={h - 24} />
        <text className="kop-fbtext" x={w / 2 + 4} y={17 + (h - 24) / 2 + 4} textAnchor="middle">
          {FB_TEXT[type]}
        </text>
        {def.pins.map((p, i) => (
          <text key={p} className="kop-pinlabel" x={8} y={29 + 20 * i + 3}>
            {p}
          </text>
        ))}
      </g>
    )
  }

  const coil = type === 'COIL' || type === 'NCOIL'
  return (
    <g>
      <rect className="kop-icon" x={6} y={17} width={24} height={24} />
      {coil ? (
        <>
          <path className={cls} d="M15 21 Q9 29 15 37 M21 21 Q27 29 21 37" />
          <path className={cls} d="M6 29 H11" />
          {type === 'NCOIL' && <path className={cls} d="M11 37 L25 21" />}
        </>
      ) : (
        <>
          <path className={cls} d="M14 21 V37 M22 21 V37 M6 29 H14 M22 29 H30" />
          {type === 'NC' && <path className={cls} d="M11 37 L25 21" />}
          {type === 'ANA' && (
            <text className="kop-anatext" x={18} y={33} textAnchor="middle">
              A
            </text>
          )}
        </>
      )}
    </g>
  )
}

/** Versión chica para la paleta */
export function PaletteIcon({ type }: { type: BlockType }) {
  const fb = !!BLOCK_DEFS[type].fbPrefix
  return (
    <svg width="18" height="18" viewBox={fb ? '4 15 52 34' : '4 15 28 28'} aria-hidden="true">
      <Glyph type={type} w={56} h={49} />
    </svg>
  )
}

import { BLOCK_DEFS } from '../plc/blockDefs'
import type { BlockType } from '../plc/types'
import { useStore } from '../store'
import { PaletteIcon } from './Glyph'

// Mismo árbol que LOGO!Soft en modo KOP: constantes arriba, funciones especiales agrupadas.
const TREE: { title: string; groups: { title?: string; items: BlockType[] }[] }[] = [
  { title: 'Constantes', groups: [{ items: ['NO', 'NC', 'ANA', 'COIL', 'NCOIL'] }] },
  {
    title: 'Funciones especiales',
    groups: [
      { title: 'Temporizadores', items: ['TON', 'TOF'] },
      { title: 'Contadores', items: ['CTR'] },
      { title: 'Analógico', items: ['ATRIG', 'ACMP'] },
      { title: 'Varios', items: ['RS'] },
    ],
  },
]

export function Palette() {
  const armed = useStore((s) => s.armed)
  const arm = useStore((s) => s.arm)

  return (
    <nav className="palette" aria-label="Bloques">
      {TREE.map((sec) => (
        <details key={sec.title} open>
          <summary>{sec.title}</summary>
          {sec.groups.map((g, gi) => (
            <div key={gi} className="palette-group">
              {g.title && <div className="palette-sub">{g.title}</div>}
              <ul>
                {g.items.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      className={`palette-item${armed === t ? ' is-armed' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', t)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      onClick={() => arm(armed === t ? null : t)}
                      aria-pressed={armed === t}
                    >
                      <PaletteIcon type={t} />
                      <span>{BLOCK_DEFS[t].name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      ))}
    </nav>
  )
}

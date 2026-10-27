import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as RPointerEvent } from 'react'
import { BLOCK_DEFS, isFb } from '../plc/blockDefs'
import type { Block, BlockEval, BlockType, FbState } from '../plc/types'
import { RAIL } from '../plc/types'
import { useStore } from '../store'
import { blockSize, inPin, outPin, RAIL_X, snap, wirePath } from './geometry'
import { Glyph } from './Glyph'

const W = 1000

const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',')
const fmtTime = (s: number) => {
  const whole = Math.floor(s)
  const cent = Math.round((s - whole) * 100)
  return `${String(whole).padStart(2, '0')}:${String(cent).padStart(2, '0')}s`
}

function paramLines(b: Block, fb?: FbState): string[] {
  const p = b.params
  switch (b.type) {
    case 'TON':
    case 'TOF':
      return fb ? [`T = ${fmt(fb.t ?? 0)} s`, `de ${fmtTime(p.T ?? 0)}`] : ['Rem = off', `${fmtTime(p.T ?? 0)}+`]
    case 'CTR':
      return fb ? [`Cnt = ${fb.count ?? 0}`, `On=${p.On} Off=${p.Off}`] : ['Rem = off', `On=${p.On}+`, `Off=${p.Off}`]
    case 'WEEK': {
      const hh = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`
      const cams = [
        [p.on1, p.off1],
        [p.on2, p.off2],
      ].filter(([a, b]) => a !== b)
      return cams.map(([a, b]) => `${hh(a ?? 0)}–${hh(b ?? 0)}`).concat(fb ? [fb.q ? 'Q = 1' : 'Q = 0'] : [])
    }
    case 'ATRIG':
    case 'ACMP':
      return fb ? [`Ax = ${fmt(fb.value ?? 0)}`, `On=${p.On} Off=${p.Off}`] : [`Gain=${fmt(p.gain ?? 1, 2)}+`, `On=${p.On}`, `Off=${p.Off}`]
    default:
      return []
  }
}

type Drag =
  | { kind: 'move'; ids: string[]; start: { x: number; y: number }; orig: Record<string, { x: number; y: number }>; moved: boolean }
  | { kind: 'wire'; from: string; s: { x: number; y: number }; cur: { x: number; y: number } }
  | null

const BlockView = memo(function BlockView({
  b,
  selected,
  ev,
  fb,
  running,
  inputOn,
}: {
  b: Block
  selected: boolean
  ev?: BlockEval
  fb?: FbState
  running: boolean
  inputOn: boolean
}) {
  const { w, h } = blockSize(b)
  const def = BLOCK_DEFS[b.type]
  const lines = paramLines(b, running ? fb : undefined)
  const fbBlock = isFb(b.type)
  // contacto cerrado (deja pasar), bobina energizada o función especial activa
  const active = running && !!ev?.out && (b.type !== 'ANA' || inputOn)

  return (
    <g transform={`translate(${b.x} ${b.y})`} className={`kop-block${selected ? ' is-selected' : ''}${active ? ' is-active' : ''}`} data-kind="block" data-id={b.id}>
      <rect className="kop-hit" x={-2} y={-2} width={w + 4} height={h + 4} data-kind="block" data-id={b.id} />
      {b.comment && (
        <text className="kop-comment" x={fbBlock ? 6 : -4} y={-6}>
          {b.comment}
        </text>
      )}
      <text className="kop-op" x={fbBlock ? w / 2 + 4 : w / 2} y={12} textAnchor="middle">
        {b.op}
      </text>
      <Glyph type={b.type} w={w} h={h} active={active} />
      {/* conexiones */}
      {def.pins.map((p, i) => (
        <g key={p}>
          <line className="kop-stub" x1={0} y1={29 + 20 * i} x2={6} y2={29 + 20 * i} />
          <circle className="kop-pin" cx={0} cy={29 + 20 * i} r={3} />
          <circle className="kop-pinhit" cx={0} cy={29 + 20 * i} r={9} data-kind="pin-in" data-id={b.id} data-pin={i} />
        </g>
      ))}
      {!def.noOutput && (
        <g>
          <line className="kop-stub" x1={w - 6} y1={outPin(b).y - b.y} x2={w} y2={outPin(b).y - b.y} />
          <circle className="kop-pin" cx={w} cy={outPin(b).y - b.y} r={3} />
          <circle className="kop-pinhit" cx={w} cy={outPin(b).y - b.y} r={9} data-kind="pin-out" data-id={b.id} />
        </g>
      )}
      {lines.length > 0 && (
        <text className={`kop-param${running ? ' is-live' : ''}`} x={6} y={h + 10}>
          {lines.map((l, i) => (
            <tspan key={i} x={6} dy={i === 0 ? 0 : 11}>
              {l}
            </tspan>
          ))}
        </text>
      )}
      {selected && <rect className="kop-selbox" x={-4} y={-4} width={w + 8} height={h + 8} />}
    </g>
  )
})

export function Canvas() {
  const circuit = useStore((s) => s.circuit)
  const selection = useStore((s) => s.selection)
  const zoom = useStore((s) => s.zoom)
  const armed = useStore((s) => s.armed)
  const running = useStore((s) => s.running)
  const result = useStore((s) => s.sim.result)
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Drag>(null)
  const lastDown = useRef({ id: '', t: 0 })

  const byId = useMemo(() => new Map(circuit.blocks.map((b) => [b.id, b])), [circuit.blocks])
  const H = useMemo(() => Math.max(900, ...circuit.blocks.map((b) => b.y + 160)), [circuit.blocks])

  const toWorld = useCallback((e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const m = svg.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = pt.matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const nearestInput = (p: { x: number; y: number }) => {
    let best: { id: string; pin: number; d: number } | null = null
    for (const b of circuit.blocks) {
      BLOCK_DEFS[b.type].pins.forEach((_, i) => {
        const q = inPin(b, i)
        const d = Math.hypot(q.x - p.x, q.y - p.y)
        if (d < 16 && (!best || d < best.d)) best = { id: b.id, pin: i, d }
      })
    }
    return best as { id: string; pin: number; d: number } | null
  }

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const t = e.target as Element
    const kind = t.getAttribute('data-kind')
    const id = t.getAttribute('data-id')
    const p = toWorld(e)
    const st = useStore.getState()

    if (armed && kind !== 'block' && kind !== 'pin-in' && kind !== 'pin-out') {
      const { w, h } = blockSize({ type: armed, x: 0, y: 0, id: '', op: '', params: {} })
      st.addBlock(armed, snap(p.x - w / 2), snap(p.y - h / 2))
      return
    }
    if (kind === 'pin-out' && id) {
      const b = byId.get(id)!
      setDrag({ kind: 'wire', from: id, s: outPin(b), cur: p })
      svgRef.current?.setPointerCapture(e.pointerId)
      return
    }
    if (kind === 'rail') {
      setDrag({ kind: 'wire', from: RAIL, s: { x: RAIL_X + 4, y: snap(p.y) }, cur: p })
      svgRef.current?.setPointerCapture(e.pointerId)
      return
    }
    if (kind === 'wire' && id) {
      st.select({ kind: 'wire', id })
      return
    }
    if ((kind === 'block' || kind === 'pin-in') && id) {
      // doble clic detectado a mano: con pointer capture el dblclick nativo pierde el bloque
      const now = performance.now()
      if (lastDown.current.id === id && now - lastDown.current.t < 380) {
        lastDown.current = { id: '', t: 0 }
        st.edit(id)
        return
      }
      lastDown.current = { id, t: now }
      let ids = [id]
      if (e.shiftKey && selection?.kind === 'block') ids = selection.ids.includes(id) ? selection.ids.filter((x) => x !== id) : [...selection.ids, id]
      else if (selection?.kind === 'block' && selection.ids.includes(id)) ids = selection.ids
      st.select({ kind: 'block', ids })
      const orig: Record<string, { x: number; y: number }> = {}
      for (const bid of ids) {
        const b = byId.get(bid)
        if (b) orig[bid] = { x: b.x, y: b.y }
      }
      setDrag({ kind: 'move', ids, start: p, orig, moved: false })
      svgRef.current?.setPointerCapture(e.pointerId)
      return
    }
    st.select(null)
  }

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!drag) return
    const p = toWorld(e)
    if (drag.kind === 'wire') {
      setDrag({ ...drag, cur: p })
      return
    }
    const dx = snap(p.x - drag.start.x)
    const dy = snap(p.y - drag.start.y)
    if (!drag.moved && dx === 0 && dy === 0) return
    const st = useStore.getState()
    if (!drag.moved) st.checkpoint()
    st.live((c) => ({
      ...c,
      blocks: c.blocks.map((b) => (drag.orig[b.id] ? { ...b, x: Math.max(30, drag.orig[b.id].x + dx), y: Math.max(20, drag.orig[b.id].y + dy) } : b)),
    }))
    if (!drag.moved) setDrag({ ...drag, moved: true })
  }

  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    if (drag?.kind === 'wire') {
      const target = nearestInput(toWorld(e))
      if (target) useStore.getState().addWire(drag.from, target.id, target.pin)
    }
    setDrag(null)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const st = useStore.getState()
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) st.redo()
      else st.undo()
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      st.redo()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      st.deleteSelection()
    } else if (e.key === 'Escape') {
      st.arm(null)
      st.select(null)
      setDrag(null)
    } else if (e.key === 'Enter' && st.selection?.kind === 'block' && st.selection.ids.length === 1) {
      st.edit(st.selection.ids[0])
    } else if (e.key.startsWith('Arrow') && st.selection?.kind === 'block') {
      e.preventDefault()
      const step = e.shiftKey ? 50 : 10
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      const ids = new Set(st.selection.ids)
      st.commit((c) => ({ ...c, blocks: c.blocks.map((b) => (ids.has(b.id) ? { ...b, x: Math.max(30, b.x + dx), y: Math.max(20, b.y + dy) } : b)) }))
    } else if (e.key === 'Tab' && !e.shiftKey && circuit.blocks.length) {
      // recorre los bloques con Tab
      e.preventDefault()
      const cur = st.selection?.kind === 'block' ? circuit.blocks.findIndex((b) => b.id === (st.selection as { ids: string[] }).ids[0]) : -1
      const next = circuit.blocks[(cur + 1) % circuit.blocks.length]
      st.select({ kind: 'block', ids: [next.id] })
    }
  }

  const onDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData('text/plain') as BlockType
    if (!type || !(type in BLOCK_DEFS)) return
    e.preventDefault()
    const p = toWorld(e)
    const { w, h } = blockSize({ type, x: 0, y: 0, id: '', op: '', params: {} })
    useStore.getState().addBlock(type, snap(p.x - w / 2), snap(p.y - h / 2))
  }

  // cables + puntos de unión
  const wires = circuit.wires
    .map((w) => {
      const to = byId.get(w.to)
      if (!to || w.pin >= BLOCK_DEFS[to.type].pins.length) return null
      const e = inPin(to, w.pin)
      let s: { x: number; y: number }
      if (w.from === RAIL) s = { x: RAIL_X + 4, y: e.y }
      else {
        const from = byId.get(w.from)
        if (!from) return null
        s = outPin(from)
      }
      return { w, ...wirePath(s, e) }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const dots = useMemo(() => {
    const count = new Map<string, number>()
    for (const w of circuit.wires) count.set(`${w.to}:${w.pin}`, (count.get(`${w.to}:${w.pin}`) ?? 0) + 1)
    const out = new Map<string, number>()
    for (const w of circuit.wires) out.set(w.from, (out.get(w.from) ?? 0) + 1)
    return { count, out }
  }, [circuit.wires])

  const selectedIds = selection?.kind === 'block' ? new Set(selection.ids) : null

  return (
    <div
      className={`kop-scroll${armed ? ' is-armed' : ''}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      aria-label="Lienzo del programa en escalera (KOP). Suprimir borra, flechas mueven, Enter edita, Tab recorre los bloques."
    >
      <svg
        ref={svgRef}
        className="kop-svg"
        width={W * zoom}
        height={H * zoom}
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <defs>
          <pattern id="kop-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.7" className="kop-griddot" />
          </pattern>
        </defs>
        <rect width={W} height={H} className="kop-bg" data-kind="bg" />
        <rect width={W} height={H} fill="url(#kop-grid)" pointerEvents="none" />

        {/* barra de alimentación izquierda */}
        <rect x={RAIL_X - 1} y={10} width={5} height={H - 20} className={`kop-rail${running ? ' is-live' : ''}`} />
        <rect x={RAIL_X - 6} y={10} width={16} height={H - 20} fill="transparent" data-kind="rail" style={{ cursor: 'crosshair' }} />

        <g>
          {wires.map(({ w, d, bend }) => {
            const live = running && !!result?.powered.has(w.id)
            const sel = selection?.kind === 'wire' && selection.id === w.id
            const junction = bend && ((dots.count.get(`${w.to}:${w.pin}`) ?? 0) > 1 || (w.from !== RAIL && (dots.out.get(w.from) ?? 0) > 1))
            return (
              <g key={w.id}>
                <path d={d} className={`kop-wire${live ? ' is-live' : ''}${sel ? ' is-selected' : ''}`} />
                <path d={d} className="kop-wirehit" data-kind="wire" data-id={w.id} />
                {junction && bend && <circle cx={bend.x} cy={bend.y} r={2.6} className={`kop-dot${live ? ' is-live' : ''}`} />}
              </g>
            )
          })}
        </g>

        {circuit.blocks.map((b) => {
          const ev = result?.blocks[b.id]
          return (
            <BlockView
              key={b.id}
              b={b}
              selected={!!selectedIds?.has(b.id)}
              ev={ev}
              fb={result?.state.fb[b.op]}
              running={running && !!result}
              inputOn={!!ev?.inputs[0]}
            />
          )
        })}

        {drag?.kind === 'wire' && <path d={`M${drag.s.x} ${drag.s.y} H${drag.cur.x} V${drag.cur.y}`} className="kop-wire is-draft" />}
      </svg>
    </div>
  )
}

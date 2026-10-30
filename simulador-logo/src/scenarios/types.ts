import type { ComponentType } from 'react'
import type { FupProgram } from '../plc/fup'
import type { Circuit } from '../plc/types'

/** Slider del entorno (clima, condiciones del proceso…) */
export interface SliderDef {
  key: string
  label: string
  unit: string
  min: number
  max: number
  step: number
  default: number
  /** se muestra como hora (14,5 → 14:30) */
  format?: 'time'
  /** puede avanzar sola con el tiempo simulado (1 unidad = 1 hora) hasta llegar al máximo */
  clock?: boolean
}

/** Entrada digital que el usuario acciona desde el panel (selector, pulsador, sensor simulado) */
/** Datos de montaje de una entrada o salida, para la tabla de E/S */
export interface Wiring {
  /** borne del módulo, por ejemplo "LOGO! I1" o "AM2 U1" */
  terminal?: string
  /** dispositivo de campo conectado */
  device?: string
}

export interface DigitalDef extends Wiring {
  op: string
  label: string
  /** switch: queda en la posición; button: vale 1 mientras se mantiene apretado */
  kind: 'switch' | 'button'
  default: boolean
  hint?: string
}

/** Sensor analógico: el escenario da el valor en unidades reales; LOGO! lo ve como value * scale (0…1000). */
export interface SensorDef<S> extends Wiring {
  op: string
  label: string
  unit: string
  min: number
  max: number
  scale: number
  read: (state: S, params: Record<string, number>) => number
}

export interface OutputDef extends Wiring {
  op: string
  label: string
}

/** Documentación del montaje: módulos usados y diagrama de conexiones */
export interface ScenarioDocs {
  hardware: { module: string; role: string }[]
  /** URL del SVG del diagrama de conexiones */
  wiringSvg: string
  notes?: string[]
}

export interface SketchProps<S> {
  state: S
  outputs: Record<string, boolean>
  params: Record<string, number>
  digital: Record<string, boolean>
}

/**
 * Un escenario es todo lo que rodea al PLC: el proceso físico, sus sliders, el dibujo y un circuito de ejemplo.
 * Para agregar otro, se crea una carpeta en src/scenarios/ y se registra en index.ts.
 */
export interface Scenario<S = any> {
  id: string
  name: string
  summary: string
  sliders: SliderDef[]
  digital: DigitalDef[]
  sensors: SensorDef<S>[]
  outputs: OutputDef[]
  init: (params: Record<string, number>) => S
  /** avanza el proceso dt segundos simulados */
  step: (state: S, outputs: Record<string, boolean>, params: Record<string, number>, digital: Record<string, boolean>, dt: number) => S
  Sketch: ComponentType<SketchProps<S>>
  example: () => Circuit
  /** el mismo programa en FUP, exportado de un .lsc de LOGO!Soft (vista "Bloques", solo simulación) */
  fup?: FupProgram
  docs?: ScenarioDocs
}

import type { Scenario } from '../types'
import { greenhouseExample } from './example'
import { initGreenhouse, stepGreenhouse, type GreenhouseState } from './physics'
import { GreenhouseSketch } from './Sketch'

export const invernadero: Scenario<GreenhouseState> = {
  id: 'invernadero',
  name: 'Invernadero',
  summary: 'Riego, calefacción, ventilación, nebulización y luces de cultivo según los sensores del invernadero.',
  sliders: [
    { key: 'tempExt', label: 'Temperatura exterior', unit: '°C', min: -5, max: 42, step: 0.5, default: 24 },
    { key: 'rhExt', label: 'Humedad relativa exterior', unit: '%', min: 10, max: 100, step: 1, default: 45 },
    { key: 'sun', label: 'Radiación solar', unit: '%', min: 0, max: 100, step: 1, default: 70 },
    { key: 'wind', label: 'Viento', unit: '%', min: 0, max: 100, step: 1, default: 20 },
    { key: 'evap', label: 'Consumo de agua del cultivo', unit: '×', min: 0.2, max: 3, step: 0.1, default: 1 },
  ],
  digital: [
    { op: 'I1', label: 'Selector automático', kind: 'switch', default: true, hint: '1 = automático' },
    { op: 'I2', label: 'Pulsador riego manual', kind: 'button', default: false, hint: 'mantener apretado' },
    { op: 'I3', label: 'Parada de emergencia', kind: 'switch', default: false, hint: '1 = parada activada' },
    { op: 'I4', label: 'Sensor de lluvia', kind: 'switch', default: false, hint: '1 = llueve' },
  ],
  sensors: [
    { op: 'AI1', label: 'Temperatura interior', unit: '°C', min: 0, max: 50, scale: 10, read: (s) => s.temp },
    { op: 'AI2', label: 'Humedad del aire', unit: '%', min: 0, max: 100, scale: 10, read: (s) => s.rh },
    { op: 'AI3', label: 'Humedad del suelo', unit: '%', min: 0, max: 100, scale: 10, read: (s) => s.soil },
    { op: 'AI4', label: 'Luz solar', unit: '%', min: 0, max: 100, scale: 10, read: (_s, p) => p.sun },
  ],
  outputs: [
    { op: 'Q1', label: 'Aspersor de riego' },
    { op: 'Q2', label: 'Ventilador extractor' },
    { op: 'Q3', label: 'Calefactor' },
    { op: 'Q4', label: 'Ventana cenital' },
    { op: 'Q5', label: 'Nebulizador' },
    { op: 'Q6', label: 'Luces de cultivo' },
    { op: 'Q7', label: 'Alarma' },
  ],
  init: initGreenhouse,
  step: stepGreenhouse,
  Sketch: GreenhouseSketch,
  example: greenhouseExample,
}

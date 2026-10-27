import type { Scenario } from '../types'
import wiringSvg from './conexiones.svg?url'
import { greenhouseExample } from './example'
import { initGreenhouse, stepGreenhouse, sunNow, type GreenhouseState } from './physics'
import { GreenhouseSketch } from './Sketch'

export const invernadero: Scenario<GreenhouseState> = {
  id: 'invernadero',
  name: 'Invernadero',
  summary:
    'Riego por horario y por humedad con detección de falla, ventilación por etapas, calefacción y nebulización con enclavamientos, luces de cultivo y alarma con reconocimiento.',
  sliders: [
    { key: 'tempExt', label: 'Temperatura exterior', unit: '°C', min: -5, max: 42, step: 0.5, default: 24 },
    { key: 'rhExt', label: 'Humedad relativa exterior', unit: '%', min: 10, max: 100, step: 1, default: 45 },
    { key: 'hour', label: 'Hora del día', unit: 'h', min: 0, max: 24, step: 0.25, default: 13, format: 'time', clock: true },
    { key: 'sun', label: 'Radiación solar máxima (cielo despejado)', unit: '%', min: 0, max: 100, step: 1, default: 75 },
    { key: 'wind', label: 'Viento', unit: '%', min: 0, max: 100, step: 1, default: 20 },
    { key: 'evap', label: 'Consumo de agua del cultivo', unit: '×', min: 0.2, max: 3, step: 0.1, default: 1 },
    { key: 'supply', label: 'Presión de agua de la red (0 = sin agua)', unit: '%', min: 0, max: 100, step: 5, default: 100 },
  ],
  digital: [
    { op: 'I1', label: 'Selector automático', kind: 'switch', default: true, hint: '1 = automático', terminal: 'LOGO! I1', device: 'Selector Manual / Automático (contacto NA)' },
    { op: 'I2', label: 'Pulsador riego manual', kind: 'button', default: false, hint: 'mantener apretado', terminal: 'LOGO! I2', device: 'Pulsador NA verde' },
    { op: 'I3', label: 'Parada de emergencia', kind: 'switch', default: false, hint: '1 = parada activada', terminal: 'LOGO! I3', device: 'Pulsador de emergencia tipo hongo con enclavamiento' },
    { op: 'I4', label: 'Sensor de lluvia', kind: 'switch', default: false, hint: '1 = llueve', terminal: 'LOGO! I4', device: 'Sensor de lluvia con salida a relé (NA)' },
    { op: 'I5', label: 'Pulsador reconocer alarmas', kind: 'button', default: false, hint: 'borra alarma y falla de riego', terminal: 'LOGO! I5', device: 'Pulsador NA amarillo' },
  ],
  sensors: [
    { op: 'AI1', label: 'Temperatura interior', unit: '°C', min: 0, max: 50, scale: 10, read: (s) => s.temp, terminal: 'LOGO! I7 (AI1)', device: 'Transmisor de temperatura 0-10 V (0-100 °C)' },
    { op: 'AI2', label: 'Humedad del aire', unit: '%', min: 0, max: 100, scale: 10, read: (s) => s.rh, terminal: 'LOGO! I8 (AI2)', device: 'Transmisor de humedad relativa 0-10 V (0-100 %)' },
    { op: 'AI3', label: 'Humedad del suelo', unit: '%', min: 0, max: 100, scale: 10, read: (s) => s.soil, terminal: 'AM2 U1 / M1', device: 'Sensor capacitivo de humedad de suelo 0-10 V' },
    { op: 'AI4', label: 'Luz solar', unit: '%', min: 0, max: 100, scale: 10, read: (_s, p) => sunNow(p), terminal: 'AM2 U2 / M2', device: 'Sensor de radiación solar 0-10 V' },
  ],
  outputs: [
    { op: 'Q1', label: 'Aspersor de riego', terminal: 'LOGO! Q1', device: 'Contactor K1: bomba / electroválvula de riego' },
    { op: 'Q2', label: 'Ventilador extractor', terminal: 'LOGO! Q2', device: 'Contactor K2 + guardamotor: ventilador' },
    { op: 'Q3', label: 'Calefactor', terminal: 'LOGO! Q3', device: 'Contactor K3: calefactor' },
    { op: 'Q4', label: 'Ventana cenital', terminal: 'LOGO! Q4', device: 'Relé K4: motor de apertura de ventana' },
    { op: 'Q5', label: 'Nebulizador', terminal: 'DM8 Q5', device: 'Contactor K5: bomba de nebulización' },
    { op: 'Q6', label: 'Luces de cultivo', terminal: 'DM8 Q6', device: 'Contactor K6: luminarias de cultivo' },
    { op: 'Q7', label: 'Alarma', terminal: 'DM8 Q7', device: 'Baliza roja y sirena 24 V CC' },
    { op: 'Q8', label: 'Aviso de riego', terminal: 'DM8 Q8', device: 'Piloto ámbar 24 V CC' },
  ],
  init: initGreenhouse,
  step: stepGreenhouse,
  Sketch: GreenhouseSketch,
  example: greenhouseExample,
  docs: {
    hardware: [
      { module: 'LOGO! 12/24 RCE (6ED1052-1MD08-0BA1)', role: 'CPU: 8 entradas (I7 e I8 como AI1 y AI2 de 0-10 V) y 4 salidas a relé de 10 A' },
      { module: 'LOGO! DM8 12/24R (6ED1055-1MB00-0BA2)', role: 'Expansión: 4 entradas y 4 salidas a relé (Q5 a Q8)' },
      { module: 'LOGO! AM2 (6ED1055-1MA00-0BA2)', role: 'Expansión: 2 entradas analógicas 0-10 V / 0-20 mA (AI3 y AI4)' },
      { module: 'LOGO! Power 24 V / 2,5 A', role: 'Fuente de 24 V CC para el PLC, los módulos, los sensores y las balizas' },
    ],
    wiringSvg,
    notes: [
      'Las cargas de 220 V CA (bombas, ventilador, calefactor, luces) se maniobran con contactores K1 a K6, cuyas bobinas alimentan las salidas a relé del PLC. Cada motor lleva guardamotor.',
      'El programa supone que cada entrada vale 1 cuando el dispositivo actúa. En el montaje real, el hongo de emergencia se cablea con su contacto NC (seguridad positiva) y en el programa sus contactos se invierten.',
      'La parada de emergencia del programa no reemplaza al corte de potencia por hardware: el hongo también abre la alimentación de las bobinas de los contactores.',
    ],
  },
}

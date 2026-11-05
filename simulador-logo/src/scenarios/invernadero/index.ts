import type { FupProgram } from '../../plc/fup'
import type { Scenario } from '../types'
import wiringSvg from './conexiones.svg?url'
import { greenhouseExample } from './example'
import fupJson from './fup.json'
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
    { key: 'sun', label: 'Radiación solar máxima (100 % = 1000 W/m²)', unit: '%', min: 0, max: 100, step: 1, default: 75 },
    { key: 'wind', label: 'Viento', unit: '%', min: 0, max: 100, step: 1, default: 20 },
    { key: 'evap', label: 'Consumo de agua del cultivo', unit: '×', min: 0.2, max: 3, step: 0.1, default: 1 },
    { key: 'supply', label: 'Presión de agua de la red (0 = sin agua)', unit: '%', min: 0, max: 100, step: 5, default: 100 },
  ],
  digital: [
    { op: 'I1', label: 'Selector automático', kind: 'switch', default: true, hint: '1 = automático', terminal: 'LOGO! I1', device: 'Selector Siemens 3SU1100-2BF60-1BA0, 2 posiciones con enclavamiento, 1 NA' },
    { op: 'I2', label: 'Pulsador riego manual', kind: 'button', default: false, hint: 'mantener apretado', terminal: 'LOGO! I2', device: 'Pulsador verde Siemens 3SU1100-0AB40-1BA0, 1 NA' },
    { op: 'I3', label: 'Parada de emergencia', kind: 'switch', default: false, hint: '1 = parada activada', terminal: 'LOGO! I3', device: 'Hongo de emergencia Siemens 3SU1100-1HB20-1CG0, 40 mm, enclavamiento, 1 NC' },
    { op: 'I4', label: 'Sensor de lluvia', kind: 'switch', default: false, hint: '1 = llueve', terminal: 'LOGO! I4', device: 'Sensor óptico de lluvia Hydreon RG-11, salida a relé NA/NC, 10-30 V CC' },
    { op: 'I5', label: 'Pulsador reconocer alarmas', kind: 'button', default: false, hint: 'borra alarma y falla de riego', terminal: 'LOGO! I5', device: 'Pulsador amarillo Siemens 3SU1100-0AB30-1BA0, 1 NA' },
  ],
  sensors: [
    // scale: cuánto lee LOGO! (0…1000) por unidad real, según el rango de cada sensor (0-10 V = 0…1000)
    { op: 'AI1', label: 'Temperatura interior', unit: '°C', min: 0, max: 50, scale: 20, read: (s) => s.temp, terminal: 'LOGO! I7 (AI1)', device: 'E+E EE210 (salida 2): temperatura, 0-10 V = 0…50 °C' },
    { op: 'AI2', label: 'Humedad del aire', unit: '%', min: 0, max: 100, scale: 10, read: (s) => s.rh, terminal: 'LOGO! I8 (AI2)', device: 'E+E EE210 (salida 1): humedad relativa, 0-10 V = 0…100 %' },
    { op: 'AI3', label: 'Humedad del suelo', unit: '%', min: 0, max: 100, scale: 10, read: (s) => s.soil, terminal: 'AM2 U1 / M1', device: 'TRUEBNER SMT100 analógico: 0-10 V = 0…100 % de humedad volumétrica' },
    { op: 'AI4', label: 'Radiación solar', unit: 'W/m²', min: 0, max: 1000, scale: 0.5, read: (_s, p) => sunNow(p) * 10, terminal: 'AM2 U2 / M2', device: 'Piranómetro Delta OHM LPPYRA03AV: 0-10 V = 0…2000 W/m²' },
  ],
  outputs: [
    { op: 'Q1', label: 'Aspersor de riego', terminal: 'LOGO! Q1', device: 'Contactor K1 Siemens 3RT2015-1AP01 (bobina 230 V CA): bomba de riego' },
    { op: 'Q2', label: 'Ventilador extractor', terminal: 'LOGO! Q2', device: 'Contactor K2 3RT2015-1AP01 + guardamotor 3RV2011-1EA10: ventilador' },
    { op: 'Q3', label: 'Calefactor', terminal: 'LOGO! Q3', device: 'Contactor K3 3RT2015-1AP01: calefactor' },
    { op: 'Q4', label: 'Ventana cenital', terminal: 'LOGO! Q4', device: 'Contactor K4 3RT2015-1AP01: motor de la ventana cenital' },
    { op: 'Q5', label: 'Nebulizador', terminal: 'DM8 Q5', device: 'Contactor K5 3RT2015-1AP01 + guardamotor 3RV2011-1EA10: bomba de nebulización' },
    { op: 'Q6', label: 'Luces de cultivo', terminal: 'DM8 Q6', device: 'Contactor K6 3RT2015-1AP01: luminarias de cultivo' },
    { op: 'Q7', label: 'Alarma', terminal: 'DM8 Q7', device: 'Columna Siemens 8WD44: luz roja 8WD4420-5AB + zumbador 8WD4420-0FA, 24 V' },
    { op: 'Q8', label: 'Aviso de riego', terminal: 'DM8 Q8', device: 'Columna Siemens 8WD44: luz ámbar 8WD4420-5AD, 24 V' },
  ],
  init: initGreenhouse,
  step: stepGreenhouse,
  Sketch: GreenhouseSketch,
  example: greenhouseExample,
  fup: fupJson as FupProgram,
  docs: {
    hardware: [
      { module: 'LOGO! 12/24 RCE 8.4 (6ED1052-1MD08-0BA2)', role: 'CPU: 8 entradas (I7 e I8 como AI1 y AI2 de 0-10 V) y 4 salidas a relé de 10 A' },
      { module: 'LOGO! DM8 12/24R (6ED1055-1MB00-0BA2)', role: 'Expansión: 4 entradas y 4 salidas a relé (Q5 a Q8)' },
      { module: 'LOGO! AM2 (6ED1055-1MA00-0BA2)', role: 'Expansión: 2 entradas analógicas 0-10 V / 0-20 mA (AI3 y AI4)' },
      { module: 'LOGO!POWER 24 V / 2,5 A (6EP3332-6SB00-0AY0)', role: 'Fuente de 24 V CC para el PLC, los módulos, los sensores y las balizas' },
    ],
    wiringSvg,
    notes: [
      'Las cargas de 220 V CA (bombas, ventilador, calefactor, luces) se maniobran con contactores K1 a K6, cuyas bobinas alimentan las salidas a relé del PLC. Cada motor lleva guardamotor.',
      'El programa supone que cada entrada vale 1 cuando el dispositivo actúa. En el montaje real, el hongo de emergencia se cablea con su contacto NC (seguridad positiva) y en el programa sus contactos se invierten.',
      'La parada de emergencia del programa no reemplaza al corte de potencia por hardware: el hongo también abre la alimentación de las bobinas de los contactores.',
    ],
  },
}

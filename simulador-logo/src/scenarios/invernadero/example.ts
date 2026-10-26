import { CircuitBuilder } from '../../plc/build'
import type { Circuit } from '../../plc/types'

// Circuito de ejemplo del invernadero. Los sensores entran como AIx (0…1000) y cada
// conmutador de umbral los pasa a unidades reales con ganancia 0,1.
export function greenhouseExample(): Circuit {
  const b = new CircuitBuilder()
  const X0 = 60
  const DX = 100
  const FBX = 470
  const QX = 660

  // --- Riego: suelo seco en automático o pulsador manual, con 8 s extra de riego
  const soil = b.add('ATRIG', FBX, 40, undefined, 'suelo húmedo', { On: 45, Off: 30, gain: 0.1, offset: 0 })
  b.series(soil, b.add('ANA', X0, 40, 'AI3', 'humedad suelo'))
  const tof = b.add('TOF', FBX, 140, undefined, 'riego +8 s', { T: 8 })
  const auto1 = b.c('I1', X0, 140, 'automático')
  const dry = b.c(soil.op, X0 + DX, 140, 'suelo seco', true)
  const manual = b.c('I2', X0, 210, 'riego manual')
  const stop1 = b.c('I3', X0 + 2 * DX + 60, 140, 'parada', true)
  b.wire(null, auto1)
  b.wire(auto1, dry)
  b.wire(dry, stop1)
  b.wire(null, manual)
  b.wire(manual, stop1)
  b.wire(stop1, tof)
  b.series(b.coil('Q1', QX, 300, 'aspersor'), b.c(tof.op, X0, 300, 'regando'))

  // --- Calefacción: frío en automático
  const warm = b.add('ATRIG', FBX, 380, undefined, 'templado', { On: 18, Off: 15, gain: 0.1, offset: 0 })
  b.series(warm, b.add('ANA', X0, 380, 'AI1', 'temperatura'))
  b.series(b.coil('Q3', QX, 470, 'calefactor'), b.c('I1', X0, 470, 'automático'), b.c(warm.op, X0 + DX, 470, 'frío', true), b.c('I3', X0 + 2 * DX, 470, 'parada', true))

  // --- Ventilación: calor en automático; la ventana solo abre si no llueve
  const hot = b.add('ATRIG', FBX, 550, undefined, 'calor', { On: 28, Off: 25, gain: 0.1, offset: 0 })
  b.series(hot, b.add('ANA', X0, 550, 'AI1', 'temperatura'))
  b.series(b.coil('Q2', QX, 640, 'ventilador'), b.c('I1', X0, 640, 'automático'), b.c(hot.op, X0 + DX, 640, 'calor'), b.c('I3', X0 + 2 * DX, 640, 'parada', true))
  b.series(
    b.coil('Q4', QX, 720, 'ventana cenital'),
    b.c('I1', X0, 720, 'automático'),
    b.c(hot.op, X0 + DX, 720, 'calor'),
    b.c('I4', X0 + 2 * DX, 720, 'lluvia', true),
    b.c('I3', X0 + 3 * DX, 720, 'parada', true),
  )

  // --- Nebulizador: aire seco
  const humid = b.add('ATRIG', FBX, 800, undefined, 'aire húmedo', { On: 65, Off: 50, gain: 0.1, offset: 0 })
  b.series(humid, b.add('ANA', X0, 800, 'AI2', 'humedad aire'))
  b.series(b.coil('Q5', QX, 890, 'nebulizador'), b.c('I1', X0, 890, 'automático'), b.c(humid.op, X0 + DX, 890, 'aire seco', true), b.c('I3', X0 + 2 * DX, 890, 'parada', true))

  // --- Luces de cultivo: poca luz solar
  const sunny = b.add('ATRIG', FBX, 970, undefined, 'hay sol', { On: 40, Off: 25, gain: 0.1, offset: 0 })
  b.series(sunny, b.add('ANA', X0, 970, 'AI4', 'luz solar'))
  b.series(b.coil('Q6', QX, 1060, 'luces de cultivo'), b.c('I1', X0, 1060, 'automático'), b.c(sunny.op, X0 + DX, 1060, 'poca luz', true), b.c('I3', X0 + 2 * DX, 1060, 'parada', true))

  // --- Alarma: temperatura muy alta o parada de emergencia
  const alarm = b.add('ATRIG', FBX, 1140, undefined, 'temp. crítica', { On: 38, Off: 35, gain: 0.1, offset: 0 })
  b.series(alarm, b.add('ANA', X0, 1140, 'AI1', 'temperatura'))
  const q7 = b.coil('Q7', QX, 1230, 'alarma')
  const hi = b.c(alarm.op, X0, 1230, 'temp. crítica')
  const em = b.c('I3', X0, 1300, 'parada')
  b.wire(null, hi)
  b.wire(null, em)
  b.wire(hi, q7)
  b.wire(em, q7)

  return b.build()
}

import { CircuitBuilder } from '../../plc/build'
import type { Block, Circuit } from '../../plc/types'

// Programa del invernadero. Los sensores entran como AIx (0…1000) y cada conmutador de umbral
// los pasa a unidades reales con ganancia 0,1 (°C o %).
//
// Entradas: I1 selector automático · I2 riego manual · I3 parada de emergencia · I4 lluvia · I5 reconocer alarmas
// Salidas:  Q1 aspersor · Q2 ventilador · Q3 calefactor · Q4 ventana · Q5 nebulizador · Q6 luces · Q7 alarma · Q8 aviso de riego
export function greenhouseExample(): Circuit {
  const b = new CircuitBuilder()
  const C0 = 60
  const C1 = 160
  const C2 = 260
  const C3 = 360
  const C4 = 460
  const FB = 580
  const QX = 760
  const atrig = (op: string, y: number, label: string, comment: string, on: number, off: number) => {
    const t = b.add('ATRIG', FB, y, undefined, comment, { On: on, Off: off, gain: 0.1, offset: 0 })
    b.series(t, b.add('ANA', C0, y, op, label))
    return t
  }
  const week = (y: number, comment: string, on1: number, off1: number, on2 = 0, off2 = 0) =>
    b.add('WEEK', FB, y, undefined, comment, { on1, off1, on2, off2 })
  /** contactos en serie desde la barra hasta una bobina */
  const rung = (target: Block, ...items: Block[]) => b.series(target, ...items)

  // ===== 1. Sensores analógicos → umbrales con histéresis
  const soilOk = atrig('AI3', 40, 'humedad suelo', 'suelo húmedo (>45 %)', 45, 30)
  // ventana (On < Off): vale 1 con el suelo por debajo de 15 %
  const soilMin = atrig('AI3', 120, 'humedad suelo', 'suelo muy seco (<15 %)', 0, 15)
  const mild = atrig('AI1', 200, 'temperatura', 'templado (>18 °C)', 18, 15)
  const hot = atrig('AI1', 280, 'temperatura', 'calor (>28 °C)', 28, 25)
  const crit = atrig('AI1', 360, 'temperatura', 'temp. crítica (>38 °C)', 38, 35)
  const humid = atrig('AI2', 440, 'humedad aire', 'aire húmedo (>65 %)', 65, 50)
  const sunny = atrig('AI4', 520, 'luz solar', 'hay sol (>40 %)', 40, 25)

  // ===== 2. Temporizadores semanales (reloj del PLC)
  const wRiego = week(600, 'horario de riego 7-9 h y 18-20 h', 7, 9, 18, 20)
  const wLuces = week(680, 'luces permitidas 6-22 h', 6, 22)
  const wDia = week(760, 'nuevo día 0:00-0:10', 0, 1 / 6)

  // ===== 3. Riego: en horario si el suelo está seco (≤30 %), o a cualquier hora si está muy seco (≤15 %);
  // en los dos casos riega hasta pasar el 45 %.
  // "Muy seco" queda memorizado desde que el suelo baja de 15 % hasta que pasa el 45 % (relé autoenclavador):
  // así no arranca fuera de horario con el suelo entre 15 y 45 %, y una vez que arranca llega hasta 45 %.
  const muySecoMem = b.add('RS', FB, 860, undefined, 'suelo muy seco: riega hasta 45 % (memoria)')
  const sMuySeco = b.c(soilMin.op, C0, 860, 'suelo <15 %')
  const rMuySeco = b.c(soilOk.op, C0, 930, 'suelo >45 %')
  b.wire(null, sMuySeco)
  b.wire(sMuySeco, muySecoMem, 0)
  b.wire(null, rMuySeco)
  b.wire(rMuySeco, muySecoMem, 1)
  // Se bloquea si hay falla de riego memorizada. El pulsador manual riega siempre (salvo emergencia).
  const yR = 1010
  const tof = b.add('TOF', FB, yR, undefined, 'riego +8 s', { T: 8 })
  const auto = b.c('I1', C0, yR, 'automático')
  const enHorario = b.c(wRiego.op, C1, yR, 'en horario')
  const seco = b.c(soilOk.op, C2, yR, 'suelo seco', true)
  const muySeco = b.c(muySecoMem.op, C1, yR + 70, 'suelo muy seco')
  const fallaRiego = b.add('RS', FB, 1400, undefined, 'falla de riego (memoria)')
  const sinFalla = b.c(fallaRiego.op, C3, yR, 'sin falla', true)
  const manual = b.c('I2', C0, yR + 140, 'riego manual')
  const parada1 = b.c('I3', C4, yR, 'emergencia', true)
  b.wire(null, auto)
  b.wire(auto, enHorario)
  b.wire(enHorario, seco)
  b.wire(auto, muySeco)
  b.wire(seco, sinFalla)
  b.wire(muySeco, sinFalla)
  b.wire(sinFalla, parada1)
  b.wire(null, manual)
  b.wire(manual, parada1)
  b.wire(parada1, tof)
  rung(b.coil('Q1', QX, 1240, 'aspersor'), b.c(tof.op, C0, 1240, 'regando'))

  // ===== 4. Detección de falla: si el aspersor estuvo 10 min seguidos y el suelo no se humedeció,
  // falta agua o falla la bomba. Queda memorizada hasta reconocer con I5.
  const tFalla = b.add('TON', FB, 1320, undefined, 'riego continuo 10 min', { T: 600 })
  rung(tFalla, b.c('Q1', C0, 1320, 'regando'), b.c(soilOk.op, C1, 1320, 'suelo sigue seco', true))
  const setFalla = b.c(tFalla.op, C0, 1400, '10 min sin humedecer')
  b.wire(null, setFalla)
  b.wire(setFalla, fallaRiego, 0)
  const ack1 = b.c('I5', C0, 1470, 'reconocer')
  b.wire(null, ack1)
  b.wire(ack1, fallaRiego, 1)

  // ===== 5. Contador de ciclos de riego del día (se reinicia a las 0:00). Aviso si pasa de 6.
  const ciclos = b.add('CTR', FB, 1550, undefined, 'ciclos de riego del día', { On: 7, Off: 7 })
  const nuevoDia = b.c(wDia.op, C0, 1550, 'nuevo día')
  const cuenta = b.c('Q1', C0, 1620, 'arranca riego')
  b.wire(null, nuevoDia)
  b.wire(nuevoDia, ciclos, 0)
  b.wire(null, cuenta)
  b.wire(cuenta, ciclos, 1)

  // Q8: aviso de riego = falla memorizada o más de 6 riegos en el día
  const q8 = b.coil('Q8', QX, 1710, 'aviso de riego')
  const avFalla = b.c(fallaRiego.op, C0, 1710, 'falla de riego')
  const avCiclos = b.c(ciclos.op, C0, 1780, 'más de 6 riegos')
  b.wire(null, avFalla)
  b.wire(null, avCiclos)
  b.wire(avFalla, q8)
  b.wire(avCiclos, q8)

  // ===== 6. Ventilación por etapas: con calor (>28 °C) abre la ventana (si no llueve).
  // El ventilador arranca si el calor sigue 3 min, si hace mucho calor (>30 °C) o si llueve (la ventana no abre).
  rung(b.coil('Q4', QX, 1870, 'ventana cenital'), b.c('I1', C0, 1870, 'automático'), b.c(hot.op, C1, 1870, 'calor'), b.c('I4', C2, 1870, 'lluvia', true), b.c('I3', C3, 1870, 'emergencia', true))
  const etapa2 = b.add('TON', FB, 1950, undefined, 'etapa 2: 3 min de calor', { T: 180 })
  rung(etapa2, b.c(hot.op, C0, 1950, 'calor'))
  const veryHot = atrig('AI1', 2030, 'temperatura', 'mucho calor (>30 °C)', 30, 28)
  const yV = 2110
  const vAuto = b.c('I1', C0, yV, 'automático')
  const vCalor = b.c(hot.op, C1, yV, 'calor')
  const vEtapa = b.c(etapa2.op, C2, yV, 'pasaron 3 min')
  const vMucho = b.c(veryHot.op, C2, yV + 70, 'más de 30 °C')
  const vLluvia = b.c('I4', C2, yV + 140, 'lluvia')
  const vParada = b.c('I3', C3, yV, 'emergencia', true)
  b.wire(null, vAuto)
  b.wire(vAuto, vCalor)
  for (const v of [vEtapa, vMucho, vLluvia]) {
    b.wire(vCalor, v)
    b.wire(v, vParada)
  }
  b.wire(vParada, b.coil('Q2', QX, yV, 'ventilador'))

  // ===== 7. Enclavamientos: no calentar con la ventana abierta; no nebulizar con el ventilador andando.
  rung(b.coil('Q3', QX, 2350, 'calefactor'), b.c('I1', C0, 2350, 'automático'), b.c(mild.op, C1, 2350, 'frío', true), b.c('Q4', C2, 2350, 'ventana abierta', true), b.c('I3', C3, 2350, 'emergencia', true))
  rung(b.coil('Q5', QX, 2430, 'nebulizador'), b.c('I1', C0, 2430, 'automático'), b.c(humid.op, C1, 2430, 'aire seco', true), b.c('Q2', C2, 2430, 'ventilador andando', true), b.c('I3', C3, 2430, 'emergencia', true))

  // ===== 8. Luces de cultivo: poca luz solar y dentro del horario permitido
  rung(b.coil('Q6', QX, 2510, 'luces de cultivo'), b.c('I1', C0, 2510, 'automático'), b.c(sunny.op, C1, 2510, 'poca luz', true), b.c(wLuces.op, C2, 2510, 'horario de luces'), b.c('I3', C3, 2510, 'emergencia', true))

  // ===== 9. Alarma con memoria: temperatura crítica o emergencia la activan; queda encendida hasta
  // reconocer con I5, y solo se puede reconocer si la causa desapareció.
  const alarma = b.add('RS', FB, 2600, undefined, 'alarma (memoria)')
  const aCrit = b.c(crit.op, C0, 2600, 'temp. crítica')
  const aEmer = b.c('I3', C0, 2670, 'emergencia')
  b.wire(null, aCrit)
  b.wire(null, aEmer)
  b.wire(aCrit, alarma, 0)
  b.wire(aEmer, alarma, 0)
  const ack2 = b.c('I5', C0, 2740, 'reconocer')
  const sinCrit = b.c(crit.op, C1, 2740, 'temp. normal', true)
  const sinEmer = b.c('I3', C2, 2740, 'sin emergencia', true)
  b.wire(null, ack2)
  b.wire(ack2, sinCrit)
  b.wire(sinCrit, sinEmer)
  b.wire(sinEmer, alarma, 1)
  rung(b.coil('Q7', QX, 2830, 'alarma'), b.c(alarma.op, C0, 2830, 'alarma memorizada'))

  return b.build()
}

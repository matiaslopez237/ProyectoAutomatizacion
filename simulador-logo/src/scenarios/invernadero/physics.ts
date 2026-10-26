// Modelo de primer orden del invernadero: cada variable tiende a un equilibrio y los actuadores lo corren.

export interface GreenhouseState {
  /** temperatura interior °C */
  temp: number
  /** humedad relativa interior % */
  rh: number
  /** humedad del suelo % */
  soil: number
  /** salud de las plantas 0…1 */
  health: number
  /** apertura de la ventana 0…1 (se mueve con inercia) */
  windowOpen: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function initGreenhouse(p: Record<string, number>): GreenhouseState {
  return { temp: p.tempExt + (p.sun / 100) * 8, rh: p.rhExt, soil: 55, health: 1, windowOpen: 0 }
}

export function stepGreenhouse(
  s: GreenhouseState,
  q: Record<string, boolean>,
  p: Record<string, number>,
  d: Record<string, boolean>,
  dt: number,
): GreenhouseState {
  const sun = p.sun / 100
  const wind = p.wind / 100
  const rain = !!d.I4

  const windowOpen = clamp(s.windowOpen + (q.Q4 ? 1 : -1) * dt * 0.25, 0, 1)
  // intercambio de aire con el exterior: filtraciones + ventilador + ventana (más con viento)
  const exchange = 0.0015 + (q.Q2 ? 0.006 : 0) + windowOpen * (0.003 + 0.004 * wind)

  let dT = (p.tempExt - s.temp) * exchange + sun * 0.024 * (rain ? 0.4 : 1)
  if (q.Q3) dT += 0.035 // calefactor
  if (q.Q5) dT -= 0.006 // el nebulizador enfría por evaporación

  let dRh = (p.rhExt - s.rh) * exchange
  if (q.Q5) dRh += 0.12
  if (q.Q1) dRh += 0.03
  dRh -= Math.max(0, s.temp - 22) * 0.0015

  // evaporación del suelo: crece con temperatura, sol y el factor del cultivo
  let dSoil = -p.evap * (0.004 + 0.0007 * Math.max(0, s.temp) + 0.008 * sun)
  if (q.Q1) dSoil += 0.22
  if (rain && windowOpen > 0.2) dSoil += 0.04 * windowOpen

  const temp = s.temp + dT * dt
  const rh = clamp(s.rh + dRh * dt, 5, 100)
  const soil = clamp(s.soil + dSoil * dt, 0, 100)

  // las plantas sufren con suelo seco, encharcado, frío o calor extremo
  const stress =
    (soil < 20 ? (20 - soil) / 20 : 0) +
    (soil > 90 ? (soil - 90) / 10 : 0) +
    (temp < 8 ? (8 - temp) / 8 : 0) +
    (temp > 36 ? (temp - 36) / 6 : 0)
  // se marchitan en el orden de una hora simulada de estrés y se recuperan más lento
  const health = clamp(s.health + (stress > 0 ? -stress * 0.0005 : 0.0003) * dt, 0, 1)

  return { temp, rh, soil, health, windowOpen }
}

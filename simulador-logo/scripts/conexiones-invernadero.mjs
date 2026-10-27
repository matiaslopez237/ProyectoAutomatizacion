// Genera el diagrama de conexiones del invernadero (src/scenarios/invernadero/conexiones.svg).
// Uso: node scripts/conexiones-invernadero.mjs
import { writeFileSync } from 'node:fs'

const W = 1280
const H = 900
const out = []
const add = (s) => out.push(s)

const C = { line: '#1a1a1a', p24: '#c62828', m: '#1565c0', l1: '#6d4c41', n: '#1565c0', box: '#eef2f4', module: '#dfe6ea', text: '#1a1a1a', muted: '#55616b' }
const font = 'font-family="Arial, Helvetica, sans-serif"'

const line = (x1, y1, x2, y2, color = C.line, w = 1.6) => add(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}"/>`)
const text = (x, y, s, { size = 12, anchor = 'middle', weight = 'normal', color = C.text, rotate } = {}) =>
  add(`<text x="${x}" y="${y}" ${font} font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : ''}>${s}</text>`)
const dot = (x, y, color = C.line) => add(`<circle cx="${x}" cy="${y}" r="3.2" fill="${color}"/>`)
const terminal = (x, y, label, below = false) => {
  add(`<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="${C.line}" stroke-width="1.4"/>`)
  text(x, below ? y + 20 : y - 10, label, { size: 10, weight: 'bold' })
}
/** contacto NA vertical entre y1 e y2 */
const switchNO = (x, y1, y2) => {
  const a = y1 + (y2 - y1) * 0.35
  const b = y1 + (y2 - y1) * 0.65
  line(x, y1, x, a)
  line(x, a, x + 12, b - 4)
  line(x, b, x, y2)
}
/** contacto NC vertical (barra que lo cruza) */
const switchNC = (x, y1, y2) => {
  switchNO(x, y1, y2)
  const b = y1 + (y2 - y1) * 0.65
  line(x - 2, b, x + 14, b)
}
const coil = (x, y, label) => {
  add(`<rect x="${x - 14}" y="${y}" width="28" height="36" fill="#fff" stroke="${C.line}" stroke-width="1.6"/>`)
  text(x + 22, y + 22, label, { size: 11, anchor: 'start', weight: 'bold' })
}
const lamp = (x, y, label) => {
  add(`<circle cx="${x}" cy="${y + 16}" r="14" fill="#fff" stroke="${C.line}" stroke-width="1.6"/>`)
  line(x - 10, y + 6, x + 10, y + 26)
  line(x + 10, y + 6, x - 10, y + 26)
  text(x - 20, y + 21, label, { size: 11, anchor: 'end', weight: 'bold' })
}
const module = (x1, x2, y1, y2, title, sub) => {
  add(`<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="4" fill="${C.module}" stroke="${C.line}" stroke-width="1.8"/>`)
  text((x1 + x2) / 2, (y1 + y2) / 2 - 2, title, { size: 15, weight: 'bold' })
  text((x1 + x2) / 2, (y1 + y2) / 2 + 16, sub, { size: 11, color: C.muted })
}

add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`)
add(`<rect width="${W}" height="${H}" fill="#ffffff"/>`)
text(30, 32, 'Invernadero automatizado: diagrama de conexiones del PLC', { size: 18, anchor: 'start', weight: 'bold' })
text(30, 52, 'LOGO! 12/24 RCE + DM8 12/24R + AM2. Mando de entradas en 24 V CC, salidas a relé.', { size: 12, anchor: 'start', color: C.muted })

// ---------- alimentación
const Y24 = 150
const YM = 172
add(`<rect x="30" y="76" width="130" height="52" rx="3" fill="${C.box}" stroke="${C.line}" stroke-width="1.4"/>`)
text(95, 98, 'G1 LOGO!Power', { size: 12, weight: 'bold' })
text(95, 116, '220 V CA / 24 V CC', { size: 11, color: C.muted })
text(176, 92, 'L1 / N 220 V CA', { size: 11, anchor: 'start', color: C.muted })
line(160, 88, 172, 88)
line(70, 128, 70, Y24, C.p24, 2)
line(120, 128, 120, YM, C.m, 2)
line(70, Y24, 1250, Y24, C.p24, 2.2)
line(120, YM, 1250, YM, C.m, 2.2)
text(1252, Y24 - 6, '+24 V', { size: 11, anchor: 'end', color: C.p24, weight: 'bold' })
text(1252, YM + 16, 'M (0 V)', { size: 11, anchor: 'end', color: C.m, weight: 'bold' })
dot(70, Y24, C.p24)
dot(120, YM, C.m)

// ---------- módulos
const YT = 330 // bornes superiores
const YB = 470 // bornes inferiores
module(250, 700, YT, YB, 'LOGO! 12/24 RCE', 'CPU · I7 = AI1, I8 = AI2 (0-10 V)')
module(740, 1010, YT, YB, 'DM8 12/24R', 'expansión digital · I9 a I12 libres')
module(1050, 1250, YT, YB, 'AM2', 'expansión analógica 0-10 V')

const powerModule = (xL, xM) => {
  line(xL, Y24, xL, YT - 5, C.p24)
  dot(xL, Y24, C.p24)
  line(xM, YM, xM, YT - 5, C.m)
  dot(xM, YM, C.m)
  terminal(xL, YT, 'L+')
  terminal(xM, YT, 'M')
}
powerModule(270, 300)
powerModule(760, 790)
powerModule(1070, 1100)

// ---------- entradas digitales
const inputs = [
  { x: 345, t: 'I1', tag: 'S1', nc: false },
  { x: 390, t: 'I2', tag: 'S2', nc: false },
  { x: 435, t: 'I3', tag: 'S0', nc: false },
  { x: 480, t: 'I4', tag: 'B1', nc: false },
  { x: 525, t: 'I5', tag: 'S3', nc: false },
]
for (const i of inputs) {
  line(i.x, Y24, i.x, 222, C.p24)
  dot(i.x, Y24, C.p24)
  ;(i.nc ? switchNC : switchNO)(i.x, 222, 288)
  line(i.x, 288, i.x, YT - 5)
  text(i.x - 6, 262, i.tag, { size: 11, anchor: 'end', weight: 'bold' })
  terminal(i.x, YT, i.t)
}
terminal(570, YT, 'I6')
text(570, YT + 22, 'libre', { size: 9, color: C.muted })

// ---------- transmisores analógicos (3 hilos: +24 V, M, señal 0-10 V)
const transmitter = (x, tag, label, sx, sLabel) => {
  add(`<rect x="${x - 26}" y="200" width="52" height="40" rx="3" fill="#fff" stroke="${C.line}" stroke-width="1.4"/>`)
  text(x, 216, tag, { size: 11, weight: 'bold' })
  text(x, 232, label, { size: 10, color: C.muted })
  line(x - 14, Y24, x - 14, 200, C.p24)
  dot(x - 14, Y24, C.p24)
  line(x, YM, x, 200, C.m)
  dot(x, YM, C.m)
  line(x + 14, 240, x + 14, 290)
  line(x + 14, 290, sx, 290)
  line(sx, 290, sx, YT - 5)
  terminal(sx, YT, sLabel)
}
transmitter(612, 'B2', 'T 0-100 °C', 615, 'I7')
transmitter(670, 'B3', 'HR 0-100 %', 660, 'I8')
transmitter(1150, 'B4', 'suelo', 1145, 'U1')
transmitter(1215, 'B5', 'radiación', 1215, 'U2')
// referencia M de los canales del AM2
terminal(1145, YB, 'M1', true)
terminal(1215, YB, 'M2', true)
line(1145, YB + 5, 1145, 520, C.m)
line(1215, YB + 5, 1215, 520, C.m)
line(1145, 520, 1215, 520, C.m)
text(1180, 538, 'M1 y M2 a M (0 V)', { size: 10, color: C.m })

// conexión entre módulos (bus lateral)
line(700, 400, 740, 400, C.muted, 6)
line(1010, 400, 1050, 400, C.muted, 6)
text(720, 390, 'bus', { size: 9, color: C.muted })
text(1030, 390, 'bus', { size: 9, color: C.muted })

// ---------- salidas a relé
const YL1 = 590
const YN = 790
line(250, YL1, 890, YL1, C.l1, 2.2)
line(250, YN, 890, YN, C.n, 2.2)
text(246, YL1 + 4, 'L1 mando 220 V CA', { size: 11, anchor: 'end', color: C.l1, weight: 'bold' })
text(246, YN + 4, 'N', { size: 11, anchor: 'end', color: C.n, weight: 'bold' })

const out220 = (x1, x2, q, k, desc) => {
  terminal(x1, YB, '1', true)
  terminal(x2, YB, '2', true)
  text((x1 + x2) / 2, YB - 12, q, { size: 11, weight: 'bold' })
  line(x1, YB + 5, x1, YL1, C.l1)
  dot(x1, YL1, C.l1)
  line(x2, YB + 5, x2, 660)
  coil(x2, 660, k)
  line(x2, 696, x2, YN)
  dot(x2, YN, C.n)
  text(x2, YN + 22, desc, { size: 10, color: C.muted })
}
out220(290, 320, 'Q1', 'K1', 'riego')
out220(395, 425, 'Q2', 'K2', 'ventilador')
out220(500, 530, 'Q3', 'K3', 'calefactor')
out220(605, 635, 'Q4', 'K4', 'ventana')
out220(770, 800, 'Q5', 'K5', 'nebulizador')
out220(835, 865, 'Q6', 'K6', 'luces')

// salidas de señalización en 24 V CC
const out24 = (x1, x2, q, h, desc) => {
  terminal(x1, YB, '1', true)
  terminal(x2, YB, '2', true)
  text((x1 + x2) / 2, YB - 12, q, { size: 11, weight: 'bold' })
  line(x1, YB + 5, x1, 560, C.p24)
  text(x1, 574, '+24 V', { size: 10, color: C.p24, weight: 'bold' })
  line(x2, YB + 5, x2, 660)
  lamp(x2, 660, h)
  line(x2, 692, x2, 740, C.m)
  text(x2, 756, 'M', { size: 10, color: C.m, weight: 'bold' })
  text(x2, YN + 22, desc, { size: 10, color: C.muted })
}
out24(915, 945, 'Q7', 'H1', 'alarma')
out24(965, 995, 'Q8', 'H2', 'aviso')

// ---------- referencias
const legend = [
  'S1  selector Manual / Automático',
  'S2  pulsador riego manual',
  'S0  hongo de emergencia (ver nota)',
  'B1  sensor de lluvia, contacto de relé',
  'S3  pulsador reconocer alarmas',
  'B2  transmisor de temperatura 0-10 V',
  'B3  transmisor de humedad relativa 0-10 V',
  'B4  sensor de humedad de suelo 0-10 V',
  'B5  sensor de radiación solar 0-10 V',
  'K1 a K6  contactores 220 V CA (con guardamotor en motores)',
  'H1  baliza y sirena 24 V CC · H2  piloto ámbar 24 V CC',
]
add(`<rect x="30" y="${YN + 40}" width="${W - 60}" height="${H - YN - 52}" rx="4" fill="${C.box}" stroke="${C.muted}" stroke-width="1"/>`)
legend.forEach((l, i) => text(46 + (i % 3) * 405, YN + 60 + Math.floor(i / 3) * 16, l, { size: 11, anchor: 'start' }))

add('</svg>')
writeFileSync('src/scenarios/invernadero/conexiones.svg', out.join('\n'))
console.log('src/scenarios/invernadero/conexiones.svg listo')

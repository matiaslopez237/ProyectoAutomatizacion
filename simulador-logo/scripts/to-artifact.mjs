// Convierte dist/index.html (documento completo) en el contenido que espera un Artifact de claude.ai:
// sin <!doctype>, <html>, <head> ni <body>, con el <title> y los estilos arriba.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? ''
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? ''

const keep = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<link rel="icon"[^>]*>/i, '')
  .trim()

mkdirSync('dist-artifact', { recursive: true })
writeFileSync('dist-artifact/simulador-logo.html', `${keep}\n${body.trim()}\n`)
console.log('dist-artifact/simulador-logo.html listo')

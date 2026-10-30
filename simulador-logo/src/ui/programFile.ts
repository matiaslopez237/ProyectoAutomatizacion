import { getScenario } from '../scenarios'

/** Nombre del archivo de cada programa del escenario: el KOP editable y el FUP exportado del .lsc. */
export function programFile(scenarioId: string, program: 'ladder' | 'fup'): string {
  const sc = getScenario(scenarioId)
  if (program === 'fup' && sc.fup) return sc.fup.source.split('/').pop() ?? `${sc.name}.lsc`
  return `${sc.name}.lld`
}

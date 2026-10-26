import { invernadero } from './invernadero'
import type { Scenario } from './types'

// Para sumar un escenario: crear su carpeta (physics, Sketch, example, index) y agregarlo acá.
export const SCENARIOS: Scenario[] = [invernadero]

export const getScenario = (id: string): Scenario => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]

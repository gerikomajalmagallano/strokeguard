import { exercises } from '@/data/exercises'
import type { AssessmentInput, Recommendation, Severity } from '@/types'

const severityRank: Record<Severity, number> = {
  Normal: 0,
  Mild: 1,
  Moderate: 2,
  Severe: 3
}

function functionalSeverities(input: AssessmentInput): Array<{ area: string; severity: Severity }> {
  const mobilitySeverity: Record<AssessmentInput['functional']['mobility'], Severity> = {
    Independent: 'Normal',
    'Needs assistance': 'Moderate',
    Unable: 'Severe'
  }

  return [
    { area: 'Upper Limb', severity: input.functional.upperLimb },
    { area: 'Lower Limb', severity: input.functional.lowerLimb },
    { area: 'Balance', severity: input.functional.balance },
    { area: 'Mobility', severity: mobilitySeverity[input.functional.mobility] }
  ]
}

export function classifyAssessment(input: AssessmentInput): { severity: Severity; reason: string } {
  const values = [
    input.facial.eyeAsymmetry,
    input.facial.mouthAsymmetry,
    ...functionalSeverities(input).map(item => item.severity)
  ]
  const severity = values.reduce((highest, current) =>
    severityRank[current] > severityRank[highest] ? current : highest, 'Normal' as Severity)
  const reason = `Overall classification is based on the highest recorded facial or functional finding (${severity.toLowerCase()}).`

  return { severity, reason }
}

export function generateRecommendations(input: AssessmentInput): Recommendation[] {
  const result: Recommendation[] = []
  const difficultyRank: Record<Recommendation['exercise']['difficulty'], number> = { Easy: 0, Moderate: 1, Advanced: 2 }
  const exerciseOrder: Record<string, number[]> = {
    'Upper Limb': [12, 11],
    'Lower Limb': [5, 4, 6, 3, 1, 2],
    Balance: [7, 8],
    Mobility: [9, 10]
  }

  for (const finding of functionalSeverities(input)) {
    if (finding.severity === 'Normal') continue

    const preferredDifficulty = finding.severity === 'Moderate' ? 'Moderate' : 'Easy'
    const preferredOrder = exerciseOrder[finding.area] ?? []
    const exercise = exercises
      .filter(item => item.targetArea === finding.area && difficultyRank[item.difficulty] <= difficultyRank[preferredDifficulty])
      .sort((a, b) =>
        Math.abs(difficultyRank[a.difficulty] - difficultyRank[preferredDifficulty]) - Math.abs(difficultyRank[b.difficulty] - difficultyRank[preferredDifficulty]) ||
        preferredOrder.indexOf(a.id) - preferredOrder.indexOf(b.id)
      )[0]

    if (!exercise) continue
    const areaName = finding.area.toLowerCase().replace('upper limb', 'upper-limb').replace('lower limb', 'lower-limb')
    result.push({
      exercise,
      reasons: [`Recommended because the functional assessment identified ${finding.severity.toLowerCase()} ${areaName} difficulty.`],
      priority: finding.severity === 'Severe' ? 'High' : finding.severity === 'Moderate' ? 'Medium' : 'Supportive'
    })
  }

  return result
}

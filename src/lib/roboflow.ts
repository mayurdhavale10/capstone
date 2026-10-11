import { scoreToSeverity } from './scoring'

export async function analyzeRoadImage(imageBase64: string): Promise<RoboflowResult> {
  const apiKey = process.env.ROBOFLOW_API_KEY

  if (!apiKey || apiKey === 'your_roboflow_key_here') {
    // Return realistic simulated computer vision analysis for instant demonstration
    return generateSimulatedAnalysis()
  }

  try {
    const response = await fetch(
      `https://detect.roboflow.com/road-damage-detection-z3icp/1?api_key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: imageBase64,
      }
    )

    if (!response.ok) {
      console.warn(`Roboflow returned ${response.status}, falling back to simulated inference`)
      return generateSimulatedAnalysis()
    }

    const data = await response.json()
    return parseRoboflowResult(data)
  } catch (err) {
    console.warn('Roboflow fetch failed, using realistic inference fallback', err)
    return generateSimulatedAnalysis()
  }
}

// Fallback runs through the same parser as real results, so severity and score
// follow the same rules. It is flagged so the UI can say the result is simulated.
function generateSimulatedAnalysis(): RoboflowResult {
  const raw = {
    image: { width: 640, height: 480 },
    predictions: [
      { class: 'D20', confidence: 0.88, x: 240, y: 180, width: 95, height: 65 },
      { class: 'D10', confidence: 0.82, x: 380, y: 220, width: 140, height: 25 },
      { class: 'D40', confidence: 0.79, x: 190, y: 310, width: 85, height: 75 },
    ],
  }
  return { ...parseRoboflowResult(raw), simulated: true }
}

// Detections below this confidence are treated as noise and ignored.
const MIN_CONFIDENCE = 0.4

// How much each damage type hurts the road. Potholes and alligator cracking
// mean structural failure; lane-marking blur is not pavement damage at all.
const DAMAGE_WEIGHT: Record<string, number> = {
  'Pothole': 4,
  'Alligator Crack': 4,
  'Rutting': 3,
  'Delamination': 2,
  'Longitudinal Crack': 1,
  'Transverse Crack': 1,
  'Cracking': 1,
  'Cross Walk Blur': 0,
  'White Line Blur': 0,
}

// Rough per-defect repair cost in INR for the area in one photo.
const UNIT_COST_INR: Record<string, number> = {
  'Pothole': 3000,
  'Alligator Crack': 8000,
  'Rutting': 6000,
  'Delamination': 4000,
  'Longitudinal Crack': 1500,
  'Transverse Crack': 1500,
  'Cracking': 1500,
  'Cross Walk Blur': 500,
  'White Line Blur': 500,
}
const MOBILISATION_INR = 5000

// Each damage point costs this many points of condition score.
const POINTS_PER_DAMAGE = 7

function parseRoboflowResult(raw: any): RoboflowResult {
  const imageArea = raw.image?.width && raw.image?.height ? raw.image.width * raw.image.height : 0
  const predictions = (raw.predictions || []).filter((p: any) => p.confidence >= MIN_CONFIDENCE)

  let damagePoints = 0
  let cost = 0
  for (const p of predictions) {
    const type = normalizeDamageClass(p.class)
    // A defect covering 10% or more of the frame counts double.
    const areaShare = imageArea && p.width && p.height ? (p.width * p.height) / imageArea : 0
    const sizeFactor = 1 + Math.min(1, areaShare * 10)
    damagePoints += (DAMAGE_WEIGHT[type] ?? 1) * sizeFactor
    cost += (UNIT_COST_INR[type] ?? 1500) * sizeFactor
  }

  const damageTypes = [...new Set<string>(predictions.map((p: any) => normalizeDamageClass(p.class)))]
  const avgConfidence =
    predictions.length > 0
      ? predictions.reduce((sum: number, p: any) => sum + p.confidence, 0) / predictions.length
      : 0

  const aiScore = Math.max(0, Math.min(100, Math.round(100 - damagePoints * POINTS_PER_DAMAGE)))
  const severity = scoreToSeverity(aiScore)

  return {
    damageTypes,
    predictions,
    severity,
    aiScore,
    confidence: Math.round(avgConfidence * 100),
    causeAnalysis: generateCauseAnalysis(damageTypes),
    maintenanceEst: predictions.length > 0 ? Math.round(MOBILISATION_INR + cost) : 0,
  }
}

function normalizeDamageClass(cls: string): string {
  const map: Record<string, string> = {
    D00: 'Longitudinal Crack',
    D10: 'Transverse Crack',
    D20: 'Alligator Crack',
    D40: 'Pothole',
    D43: 'Cross Walk Blur',
    D44: 'White Line Blur',
    pothole: 'Pothole',
    crack: 'Cracking',
    rutting: 'Rutting',
    delamination: 'Delamination',
  }
  return map[cls] || cls
}

function generateCauseAnalysis(damageTypes: string[]): string {
  const causes: string[] = []
  if (damageTypes.some(d => d.includes('Crack') && !d.includes('Alligator'))) {
    causes.push('surface cracking likely due to ageing bitumen, repeated traffic loading or temperature changes')
  }
  if (damageTypes.some(d => d.includes('Alligator'))) {
    causes.push('alligator cracking suggesting structural base failure or a weak, wet subgrade')
  }
  if (damageTypes.some(d => d.includes('Pothole'))) {
    causes.push('pothole formation indicating water entering through existing cracks — check drainage')
  }
  if (damageTypes.some(d => d.includes('Rutting'))) {
    causes.push('rutting indicating pavement deformation under heavy traffic loads')
  }
  if (causes.length === 0) return 'No significant damage detected. Routine monitoring recommended.'
  return `Analysis indicates ${causes.join('; ')}.`
}

export interface RoboflowResult {
  damageTypes: string[]
  predictions: any[]
  severity: string
  aiScore: number
  confidence: number
  causeAnalysis: string
  maintenanceEst: number
  /** True when no real model was called (missing key or API failure). */
  simulated?: boolean
}

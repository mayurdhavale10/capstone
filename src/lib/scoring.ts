// Single source of truth for road scoring. Pure functions only (no Prisma),
// so they run on the server (API routes, seed) and in client pages alike.
//
// Two separate numbers are kept on purpose:
//   - Health score (0-100): the road's CURRENT condition, from AI inspections only.
//   - Risk score   (0-100): how fast it is LIKELY to get worse, from site factors
//                           (drainage, waterlogging, rainfall, soil, traffic, age, thickness).
// Mixing them would hide what the photos actually show. They are combined only in
// priorityScore(), which ranks where maintenance money should go first.

export type RoadStatus = 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL'
export type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

type DateLike = string | Date

export interface InspectionLike {
  date: DateLike
  aiScore?: number | null
  severityLevel: string
}

export interface RoadLike {
  healthScore: number
  status: string
  constructedAt: DateLike
  trafficVolume: string
  drainageCondition?: string | null
  waterlogging?: boolean | null
  rainfallZone?: string | null
  soilType?: string | null
  pavementThicknessMm?: number | null
  contractorName?: string | null
  tenderId?: string | null
  contractCost?: number | null
  lastRepairAt?: DateLike | null
  lastRepairType?: string | null
  defectLiabilityYears?: number | null
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))

// ---------------------------------------------------------------------------
// Health score
// ---------------------------------------------------------------------------

export function scoreToStatus(score: number): RoadStatus {
  if (score >= 75) return 'GOOD'
  if (score >= 50) return 'FAIR'
  if (score >= 25) return 'POOR'
  return 'CRITICAL'
}

export function scoreToSeverity(score: number): Severity {
  const map: Record<RoadStatus, Severity> = { GOOD: 'LOW', FAIR: 'MODERATE', POOR: 'HIGH', CRITICAL: 'CRITICAL' }
  return map[scoreToStatus(score)]
}

// Each severity band maps onto the matching status band, so a CRITICAL
// inspection can actually pull a road down to CRITICAL.
const SEVERITY_CAP: Record<Severity, number> = { LOW: 100, MODERATE: 74, HIGH: 49, CRITICAL: 24 }
const SEVERITY_DEFAULT: Record<Severity, number> = { LOW: 90, MODERATE: 62, HIGH: 37, CRITICAL: 12 }

function toSeverity(s: string): Severity {
  return s in SEVERITY_CAP ? (s as Severity) : 'LOW'
}

/** Condition score of one inspection: the AI score, capped by its severity band. */
export function inspectionScore(ins: Pick<InspectionLike, 'aiScore' | 'severityLevel'>): number {
  const sev = toSeverity(ins.severityLevel)
  const base = ins.aiScore ?? SEVERITY_DEFAULT[sev]
  return clamp(Math.round(Math.min(base, SEVERITY_CAP[sev])))
}

const RECENT_WEIGHTS = [0.5, 0.3, 0.2]

/**
 * Health score from the 3 most recent inspections, newest weighted most.
 * Inspections taken before the last repair are ignored — they describe a
 * surface that no longer exists.
 */
export function computeHealthScore(
  inspections: InspectionLike[],
  lastRepairAt?: DateLike | null,
): number {
  const repairTime = lastRepairAt ? new Date(lastRepairAt).getTime() : -Infinity
  const recent = inspections
    .filter((i) => new Date(i.date).getTime() >= repairTime)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RECENT_WEIGHTS.length)

  if (recent.length === 0) return 100

  const weights = RECENT_WEIGHTS.slice(0, recent.length)
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  const weighted = recent.reduce((s, ins, i) => s + inspectionScore(ins) * weights[i], 0)
  return Math.round(weighted / totalWeight)
}

// ---------------------------------------------------------------------------
// Risk factors
// ---------------------------------------------------------------------------

export interface RiskFactor {
  key: string
  label: string
  value: string
  level: RiskLevel
  points: number
  detail: string
}

export interface RiskAssessment {
  score: number
  level: RiskLevel
  factors: RiskFactor[]
}

export const DRAINAGE_LABELS: Record<string, string> = {
  GOOD: 'Good — drains clear',
  PARTIALLY_BLOCKED: 'Partially blocked',
  BLOCKED: 'Blocked / silted',
  NONE: 'No drainage',
  UNKNOWN: 'Not surveyed',
}

export const RAINFALL_LABELS: Record<string, string> = {
  LOW: 'Low (< 750 mm/yr)',
  MODERATE: 'Moderate (750–1500 mm/yr)',
  HIGH: 'High (1500–2500 mm/yr)',
  VERY_HIGH: 'Very high (> 2500 mm/yr)',
}

export const SOIL_LABELS: Record<string, string> = {
  ROCKY: 'Rocky',
  GRAVEL: 'Gravel / murrum',
  SANDY: 'Sandy',
  LOAMY: 'Loamy',
  CLAY: 'Clay',
  BLACK_COTTON: 'Black cotton (expansive)',
  UNKNOWN: 'Not surveyed',
}

const levelFor = (points: number, high: number, medium: number): RiskLevel =>
  points >= high ? 'HIGH' : points >= medium ? 'MEDIUM' : 'LOW'

function yearsBetween(from: DateLike, to = new Date()): number {
  return (to.getTime() - new Date(from).getTime()) / (365.25 * 24 * 3600 * 1000)
}

export function trafficClass(trafficVolume: string): 'HEAVY' | 'HIGH' | 'MEDIUM' | 'LOW' {
  const t = trafficVolume.toLowerCase()
  if (/heavy|freight|industrial|> ?35/.test(t)) return 'HEAVY'
  if (/high|arterial/.test(t)) return 'HIGH'
  if (/medium|collector/.test(t)) return 'MEDIUM'
  return 'LOW'
}

/** Risk assessment from the road's site data plus the damage seen in inspections. */
export function assessRisk(road: RoadLike, observedDamage: string[] = []): RiskAssessment {
  const factors: RiskFactor[] = []
  const hasPotholes = observedDamage.some((d) => /pothole/i.test(d))
  const hasCracks = observedDamage.some((d) => /crack/i.test(d))
  const drainage = road.drainageCondition || 'UNKNOWN'
  const rainfall = road.rainfallZone || 'MODERATE'
  const soil = road.soilType || 'UNKNOWN'
  const badDrainage = drainage === 'BLOCKED' || drainage === 'NONE' || drainage === 'PARTIALLY_BLOCKED'
  const wetRegion = rainfall === 'HIGH' || rainfall === 'VERY_HIGH'

  // 1. Drainage — water is the main cause of pavement failure.
  {
    const points = { GOOD: 0, PARTIALLY_BLOCKED: 12, BLOCKED: 22, NONE: 25, UNKNOWN: 8 }[drainage] ?? 8
    let detail: string
    if (drainage === 'GOOD') {
      detail = 'Drains are clear, so rainwater leaves the surface quickly and the base stays dry.'
    } else if (drainage === 'UNKNOWN') {
      detail = 'Drainage has not been surveyed. Record it at the next inspection; it is the single biggest cause of road failure.'
    } else {
      const what = drainage === 'NONE' ? 'There is no drainage, so' : 'Drains are blocked, so'
      detail = `${what} water stands on and beside the road and soaks into the base layers.`
      if (hasPotholes || hasCracks) {
        detail += ` Combined with the ${hasPotholes ? 'potholes' : 'cracks'} found in inspections, water is likely entering the base through the surface. Fix drainage before patching, or the patches will fail again.`
      }
    }
    factors.push({ key: 'drainage', label: 'Drainage', value: DRAINAGE_LABELS[drainage] ?? drainage, level: levelFor(points, 20, 10), points, detail })
  }

  // 2. Waterlogging
  if (road.waterlogging) {
    const points = 15
    factors.push({
      key: 'waterlogging', label: 'Waterlogging', value: 'Reported', level: 'HIGH', points,
      detail: 'Water pools on this road after rain. Standing water softens bitumen and the layers below, and vehicles driving through it pump water into cracks.',
    })
  }

  // 3. Rainfall
  {
    let points = { LOW: 0, MODERATE: 4, HIGH: 8, VERY_HIGH: 12 }[rainfall] ?? 4
    let detail = `Annual rainfall is ${(RAINFALL_LABELS[rainfall] ?? rainfall).toLowerCase()}.`
    if (wetRegion && badDrainage) {
      points += 5
      detail += ' Heavy rain plus poor drainage is the worst combination — expect damage to spread fast every monsoon.'
    } else if (wetRegion) {
      detail += ' Drainage is the main defence here; keep it maintained before each monsoon.'
    }
    factors.push({ key: 'rainfall', label: 'Rainfall zone', value: RAINFALL_LABELS[rainfall] ?? rainfall, level: levelFor(points, 12, 6), points, detail })
  }

  // 4. Soil / subgrade
  {
    const points = { ROCKY: 0, GRAVEL: 2, SANDY: 5, LOAMY: 4, CLAY: 10, BLACK_COTTON: 15, UNKNOWN: 4 }[soil] ?? 4
    const details: Record<string, string> = {
      BLACK_COTTON: 'Black cotton soil swells when wet and shrinks when dry, cracking the road from below. Needs a thicker base or soil stabilisation.',
      CLAY: 'Clay loses strength when wet, so the road can sink and rut under heavy vehicles, especially if drainage is poor.',
      SANDY: 'Sandy soil drains well but can erode at the edges and shoulders.',
      LOAMY: 'Loamy soil gives moderate support; it weakens if kept wet.',
      GRAVEL: 'Gravel or murrum gives good support and drains well.',
      ROCKY: 'Rocky subgrade gives excellent support.',
      UNKNOWN: 'Soil type has not been recorded.',
    }
    factors.push({ key: 'soil', label: 'Subgrade soil', value: SOIL_LABELS[soil] ?? soil, level: levelFor(points, 10, 5), points, detail: details[soil] ?? details.UNKNOWN })
  }

  // 5. Traffic load
  const traffic = trafficClass(road.trafficVolume)
  {
    const points = { HEAVY: 15, HIGH: 10, MEDIUM: 5, LOW: 2 }[traffic]
    const details = {
      HEAVY: 'Heavy trucks cause most structural damage — one loaded truck does as much damage as thousands of cars.',
      HIGH: 'High traffic volume speeds up surface wear and crack growth.',
      MEDIUM: 'Moderate traffic load.',
      LOW: 'Light traffic; damage here is more likely from water or age than from loads.',
    }
    factors.push({ key: 'traffic', label: 'Traffic load', value: road.trafficVolume, level: levelFor(points, 15, 10), points, detail: details[traffic] })
  }

  // 6. Age since last major works
  {
    const since = road.lastRepairAt ?? road.constructedAt
    const age = Math.max(0, yearsBetween(since))
    const points = age > 15 ? 15 : age > 10 ? 10 : age > 5 ? 5 : 0
    const what = road.lastRepairAt ? 'last major repair' : 'construction'
    factors.push({
      key: 'age', label: 'Age of surface', value: `${age.toFixed(1)} years since ${what}`, level: levelFor(points, 15, 10), points,
      detail: points >= 10
        ? 'The surface is old; bitumen hardens and becomes brittle with age, so cracks appear and spread faster.'
        : 'The surface is relatively new.',
    })
  }

  // 7. Pavement thickness (only when known)
  if (road.pavementThicknessMm != null) {
    const thin = road.pavementThicknessMm < 40
    const points = thin ? (traffic === 'HEAVY' || traffic === 'HIGH' ? 10 : 5) : 0
    factors.push({
      key: 'thickness', label: 'Bituminous layer', value: `${road.pavementThicknessMm} mm`, level: levelFor(points, 10, 5), points,
      detail: thin
        ? 'The bituminous layer is thin for this traffic; it will fatigue and crack early.'
        : 'Layer thickness is adequate.',
    })
  }

  const score = clamp(factors.reduce((s, f) => s + f.points, 0))
  factors.sort((a, b) => b.points - a.points)
  return { score, level: score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW', factors }
}

// ---------------------------------------------------------------------------
// Contract & warranty (defect liability period)
// ---------------------------------------------------------------------------

export interface WarrantyStatus {
  contractor: string
  tenderId: string | null
  worksDate: Date
  expiresAt: Date
  active: boolean
  daysLeft: number
  /** Under warranty AND the road has already failed — repairs are the contractor's cost. */
  contractorLiable: boolean
}

export function warrantyStatus(road: RoadLike, now = new Date()): WarrantyStatus | null {
  if (!road.contractorName || !road.defectLiabilityYears) return null
  const worksDate = new Date(road.lastRepairAt ?? road.constructedAt)
  const expiresAt = new Date(worksDate)
  expiresAt.setFullYear(expiresAt.getFullYear() + road.defectLiabilityYears)
  const active = now < expiresAt
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1000))
  return {
    contractor: road.contractorName,
    tenderId: road.tenderId ?? null,
    worksDate,
    expiresAt,
    active,
    daysLeft,
    contractorLiable: active && road.healthScore < 50,
  }
}

// ---------------------------------------------------------------------------
// Recommendations & prioritisation
// ---------------------------------------------------------------------------

export function recommendActions(road: RoadLike, risk: RiskAssessment): string[] {
  const actions: string[] = []
  const warranty = warrantyStatus(road)
  const drainage = road.drainageCondition || 'UNKNOWN'

  if (warranty?.contractorLiable) {
    actions.push(
      `Issue a defect notice to ${warranty.contractor}${warranty.tenderId ? ` (tender ${warranty.tenderId})` : ''}. ` +
      `The road is under its defect liability period until ${warranty.expiresAt.toLocaleDateString('en-IN')}, so repairs are at the contractor's cost.`,
    )
  }

  if (drainage === 'BLOCKED' || drainage === 'PARTIALLY_BLOCKED') {
    actions.push('Clear and desilt side drains and culverts before any surface repair.')
  } else if (drainage === 'NONE') {
    actions.push('Build side drains and a proper camber before resurfacing; without them any new surface will fail early.')
  } else if (drainage === 'UNKNOWN') {
    actions.push('Survey drainage condition at the next inspection.')
  }
  if (road.waterlogging) actions.push('Raise or regrade low spots where water pools.')

  if (road.healthScore >= 75) {
    actions.push(risk.level === 'HIGH'
      ? 'Condition is good but risk is high: do preventive crack sealing now — it costs far less than rebuilding later.'
      : 'Routine monitoring; preventive crack sealing within 12 months.')
  } else if (road.healthScore >= 50) {
    actions.push('Seal cracks and patch potholes; plan a thin overlay to restore ride quality.')
  } else if (road.healthScore >= 25) {
    actions.push('Mill the damaged wearing course and lay a new bituminous overlay; deep-patch potholes first.')
  } else {
    actions.push('Structural failure: full-depth reconstruction of failed sections, including base and subgrade strengthening.')
  }

  if (road.soilType === 'BLACK_COTTON' && road.healthScore < 75) {
    actions.push('Stabilise the black cotton subgrade (e.g. lime treatment or a capping layer) during reconstruction.')
  }
  return actions
}

/** 0-100: higher = fund sooner. Mostly current condition, partly future risk. */
export function priorityScore(healthScore: number, riskScore: number): number {
  return Math.round(clamp((100 - healthScore) * 0.7 + riskScore * 0.3))
}

// Parses the site-condition and contract fields of a road from a request body.
// Only keys present in the body are returned, so it works for both create and PATCH.

const DRAINAGE = ['GOOD', 'PARTIALLY_BLOCKED', 'BLOCKED', 'NONE', 'UNKNOWN']
const RAINFALL = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']
const SOIL = ['ROCKY', 'GRAVEL', 'SANDY', 'LOAMY', 'CLAY', 'BLACK_COTTON', 'UNKNOWN']

const has = (data: any, key: string) => data[key] !== undefined
const optString = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const optNumber = (v: any) => (v === '' || v === null || isNaN(Number(v)) ? null : Number(v))
const optDate = (v: any) => (v ? new Date(v) : null)

function oneOf(v: any, allowed: string[], field: string): string {
  if (!allowed.includes(v)) throw new Error(`Invalid ${field}: ${v}`)
  return v
}

export function parseRoadSiteFields(data: any) {
  const out: Record<string, unknown> = {}
  if (has(data, 'drainageCondition')) out.drainageCondition = oneOf(data.drainageCondition, DRAINAGE, 'drainageCondition')
  if (has(data, 'waterlogging')) out.waterlogging = Boolean(data.waterlogging)
  if (has(data, 'rainfallZone')) out.rainfallZone = oneOf(data.rainfallZone, RAINFALL, 'rainfallZone')
  if (has(data, 'soilType')) out.soilType = oneOf(data.soilType, SOIL, 'soilType')
  if (has(data, 'pavementThicknessMm')) {
    const n = optNumber(data.pavementThicknessMm)
    out.pavementThicknessMm = n === null ? null : Math.round(n)
  }
  if (has(data, 'contractorName')) out.contractorName = optString(data.contractorName)
  if (has(data, 'tenderId')) out.tenderId = optString(data.tenderId)
  if (has(data, 'contractCost')) out.contractCost = optNumber(data.contractCost)
  if (has(data, 'lastRepairAt')) out.lastRepairAt = optDate(data.lastRepairAt)
  if (has(data, 'lastRepairType')) out.lastRepairType = optString(data.lastRepairType)
  if (has(data, 'defectLiabilityYears')) {
    const n = optNumber(data.defectLiabilityYears)
    out.defectLiabilityYears = n === null ? null : Math.round(n)
  }
  return out
}

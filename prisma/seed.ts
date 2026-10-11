import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { computeHealthScore, scoreToSeverity, scoreToStatus } from '../src/lib/scoring'

const prisma = new PrismaClient()

// Each road has a history of AI condition scores (oldest → newest). Severity,
// damage types and the road's health score are all derived from these, using
// the same rules the app uses, so the demo data is internally consistent.
type SeedInspection = { date: string; aiScore: number; weather?: string; drainage?: string }

const roads: Array<{ data: any; history: SeedInspection[] }> = [
  {
    // Under warranty AND failing → contractor liable (the key demo case)
    data: {
      name: 'Katraj–Kondhwa Road',
      location: 'Katraj Chowk to Kondhwa Budruk, KM 0.0–5.8',
      city: 'Pune', state: 'MH', lat: 18.4575, lng: 73.8636, lengthKm: 5.8,
      material: 'Asphalt Concrete', constructedAt: new Date('2011-04-10'),
      trafficVolume: 'Heavy Industrial / Freight Corridor (> 35,000 AADT)',
      drainageCondition: 'BLOCKED', waterlogging: true, rainfallZone: 'MODERATE', soilType: 'BLACK_COTTON',
      pavementThicknessMm: 40,
      contractorName: 'Shree Infra Builders', tenderId: 'PMC/RD/2024/117', contractCost: 42000000,
      lastRepairAt: new Date('2024-06-15'), lastRepairType: 'Bituminous overlay (BC 40 mm)', defectLiabilityYears: 5,
      description: 'Steep gradient with heavy truck traffic to the Kondhwa industrial area. Side drains silted near Katraj lake.',
    },
    history: [
      { date: '2024-12-05', aiScore: 48, weather: 'Clear' },
      { date: '2025-07-20', aiScore: 30, weather: 'Rain', drainage: 'BLOCKED' },
      { date: '2026-01-14', aiScore: 18, weather: 'Clear' },
      { date: '2026-08-02', aiScore: 12, weather: 'Rain', drainage: 'BLOCKED' },
    ],
  },
  {
    data: {
      name: 'Pune–Solapur Highway (Hadapsar stretch)',
      location: 'Hadapsar Gadital to Manjari, NH-65 KM 8–17',
      city: 'Pune', state: 'MH', lat: 18.5018, lng: 73.9260, lengthKm: 9.0,
      material: 'Asphalt Concrete', constructedAt: new Date('2012-02-01'),
      trafficVolume: 'Heavy Industrial / Freight Corridor (> 35,000 AADT)',
      drainageCondition: 'PARTIALLY_BLOCKED', waterlogging: false, rainfallZone: 'LOW', soilType: 'BLACK_COTTON',
      pavementThicknessMm: 50,
      contractorName: 'Shree Infra Builders', tenderId: 'NHAI/PNE/2023/044', contractCost: 61000000,
      lastRepairAt: new Date('2023-03-20'), lastRepairType: 'Mill and overlay', defectLiabilityYears: 3,
    },
    history: [
      { date: '2023-11-10', aiScore: 82 },
      { date: '2024-09-18', aiScore: 72, weather: 'Rain' },
      { date: '2025-08-25', aiScore: 61, weather: 'Rain' },
      { date: '2026-06-30', aiScore: 55, weather: 'Cloudy' },
    ],
  },
  {
    data: {
      name: 'Fergusson College Road',
      location: 'Shivajinagar, Deccan to Goodluck Chowk',
      city: 'Pune', state: 'MH', lat: 18.5236, lng: 73.8410, lengthKm: 2.1,
      material: 'Stone Matrix Asphalt (SMA)', constructedAt: new Date('2008-06-01'),
      trafficVolume: 'Urban Arterial (15,000 - 35,000 AADT)',
      drainageCondition: 'GOOD', waterlogging: false, rainfallZone: 'LOW', soilType: 'LOAMY',
      pavementThicknessMm: 50,
      contractorName: 'Metro Roadways Pvt Ltd', tenderId: 'PMC/RD/2024/203', contractCost: 18500000,
      lastRepairAt: new Date('2024-11-05'), lastRepairType: 'Resurfacing (SMA 50 mm)', defectLiabilityYears: 3,
    },
    history: [
      { date: '2024-03-12', aiScore: 46 }, // before resurfacing — ignored by the health score
      { date: '2025-04-22', aiScore: 93 },
      { date: '2026-05-16', aiScore: 88 },
    ],
  },
  {
    data: {
      name: 'Baner–Balewadi High Street',
      location: 'Baner Road to Balewadi Stadium',
      city: 'Pune', state: 'MH', lat: 18.5642, lng: 73.7769, lengthKm: 3.4,
      material: 'Portland Cement Concrete', constructedAt: new Date('2019-01-15'),
      trafficVolume: 'Commercial Collector (5,000 - 15,000 AADT)',
      drainageCondition: 'GOOD', waterlogging: false, rainfallZone: 'LOW', soilType: 'GRAVEL',
      contractorName: 'Metro Roadways Pvt Ltd', tenderId: 'PMC/RD/2018/089', contractCost: 54000000,
      defectLiabilityYears: 5,
    },
    history: [
      { date: '2023-10-03', aiScore: 95 },
      { date: '2024-10-11', aiScore: 91 },
      { date: '2025-10-08', aiScore: 86 },
    ],
  },
  {
    data: {
      name: 'Old Mumbai–Pune Highway (Lonavala Ghat)',
      location: 'Khandala to Lonavala, NH-48 old alignment KM 92–99',
      city: 'Lonavala', state: 'MH', lat: 18.7546, lng: 73.4062, lengthKm: 7.2,
      material: 'Asphalt Concrete', constructedAt: new Date('2005-05-01'),
      trafficVolume: 'Urban Arterial (15,000 - 35,000 AADT)',
      drainageCondition: 'NONE', waterlogging: true, rainfallZone: 'VERY_HIGH', soilType: 'ROCKY',
      pavementThicknessMm: 40,
      contractorName: 'Sahyadri Constructions', tenderId: 'PWD/MH/2021/512', contractCost: 37500000,
      lastRepairAt: new Date('2021-04-01'), lastRepairType: 'Bituminous overlay', defectLiabilityYears: 3,
      description: 'Ghat section with over 4,000 mm of monsoon rainfall. Water runs down the carriageway for lack of side drains.',
    },
    history: [
      { date: '2022-02-10', aiScore: 66 },
      { date: '2023-09-05', aiScore: 52, weather: 'Rain', drainage: 'NONE' },
      { date: '2024-09-12', aiScore: 44, weather: 'Rain' },
      { date: '2025-09-20', aiScore: 39, weather: 'Rain', drainage: 'NONE' },
    ],
  },
  {
    data: {
      name: 'Hinjewadi Phase 3 Link Road',
      location: 'Maan Road junction to Phase 3 IT Park',
      city: 'Pune', state: 'MH', lat: 18.5913, lng: 73.7070, lengthKm: 4.6,
      material: 'Asphalt Concrete', constructedAt: new Date('2022-03-01'),
      trafficVolume: 'Urban Arterial (15,000 - 35,000 AADT)',
      drainageCondition: 'PARTIALLY_BLOCKED', waterlogging: false, rainfallZone: 'MODERATE', soilType: 'CLAY',
      pavementThicknessMm: 30,
      contractorName: 'Sahyadri Constructions', tenderId: 'PMRDA/2021/078', contractCost: 29000000,
      defectLiabilityYears: 5,
      description: 'New road with a thin bituminous layer carrying heavy IT-park bus and construction traffic.',
    },
    history: [
      { date: '2023-08-14', aiScore: 84 },
      { date: '2024-08-21', aiScore: 70, weather: 'Rain' },
      { date: '2025-08-19', aiScore: 57, weather: 'Rain', drainage: 'PARTIALLY_BLOCKED' },
    ],
  },
]

function damageFor(score: number): string[] {
  if (score >= 85) return []
  if (score >= 75) return ['Longitudinal Crack']
  if (score >= 50) return ['Longitudinal Crack', 'Transverse Crack']
  if (score >= 25) return ['Alligator Crack', 'Pothole']
  return ['Alligator Crack', 'Pothole', 'Rutting']
}

function causeFor(score: number): string {
  if (score >= 75) return 'No significant damage detected. Routine monitoring recommended.'
  if (score >= 50) return 'Analysis indicates surface cracking likely due to ageing bitumen, repeated traffic loading or temperature changes.'
  return 'Analysis indicates alligator cracking suggesting structural base failure or a weak, wet subgrade; pothole formation indicating water entering through existing cracks — check drainage.'
}

async function main() {
  console.log('Cleaning existing data...')
  await prisma.inspection.deleteMany()
  await prisma.road.deleteMany()
  await prisma.user.deleteMany()

  console.log('Seeding users...')
  const password = await bcrypt.hash('admin123', 10)
  const passwordInspector = await bcrypt.hash('inspect123', 10)
  const passwordViewer = await bcrypt.hash('view123', 10)

  await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@roadiq.com', password, role: 'ADMIN' },
  })
  const inspector = await prisma.user.create({
    data: { name: 'Field Inspector', email: 'inspector@roadiq.com', password: passwordInspector, role: 'INSPECTOR' },
  })
  await prisma.user.create({
    data: { name: 'Viewer User', email: 'viewer@roadiq.com', password: passwordViewer, role: 'VIEWER' },
  })

  console.log('Seeding roads...')
  for (const { data, history } of roads) {
    const road = await prisma.road.create({ data })

    for (const h of history) {
      const damageTypes = damageFor(h.aiScore)
      await prisma.inspection.create({
        data: {
          roadId: road.id,
          inspectorId: inspector.id,
          date: new Date(h.date),
          aiScore: h.aiScore,
          damageTypes: JSON.stringify(damageTypes),
          severityLevel: scoreToSeverity(h.aiScore),
          notes: 'Routine AI inspection.',
          weatherCond: h.weather ?? 'Clear',
          trafficLoad: road.trafficVolume,
          drainageObserved: h.drainage ?? null,
          causeAnalysis: causeFor(h.aiScore),
          maintenanceEst: damageTypes.length === 0 ? 0 : Math.round((100 - h.aiScore) * 900),
        },
      })
    }

    const inspections = await prisma.inspection.findMany({ where: { roadId: road.id } })
    const healthScore = computeHealthScore(inspections, road.lastRepairAt)
    await prisma.road.update({
      where: { id: road.id },
      data: { healthScore, status: scoreToStatus(healthScore) },
    })
    console.log(`  ${road.name}: health ${healthScore} (${scoreToStatus(healthScore)})`)
  }

  console.log('Database seeded!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

export type UserRole = 'ADMIN' | 'INSPECTOR' | 'VIEWER'
export type RoadStatus = 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL'
export type SeverityLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

export interface Road {
  id: string
  name: string
  location: string
  city: string
  state: string
  lat: number
  lng: number
  lengthKm: number
  material: string
  constructedAt: string
  trafficVolume: string
  healthScore: number
  status: RoadStatus
  description?: string
  drainageCondition: string
  waterlogging: boolean
  rainfallZone: string
  soilType: string
  pavementThicknessMm?: number | null
  contractorName?: string | null
  tenderId?: string | null
  contractCost?: number | null
  lastRepairAt?: string | null
  lastRepairType?: string | null
  defectLiabilityYears?: number | null
  inspections?: Inspection[]
  _count?: { inspections: number }
  createdAt: string
  updatedAt: string
}

export interface Inspection {
  id: string
  roadId: string
  road?: Road
  inspectorId: string
  inspector?: User
  date: string
  imageUrl?: string
  aiScore?: number
  damageTypes: string[]
  severityLevel: SeverityLevel
  notes?: string
  weatherCond?: string
  trafficLoad?: string
  causeAnalysis?: string
  maintenanceEst?: number
  createdAt: string
}

export interface AnalyticsData {
  totalRoads: number
  totalInspections: number
  criticalRoads: number
  avgHealthScore: number
  roadsByStatus: { status: string; count: number }[]
  recentInspections: Inspection[]
  topDamageTypes: { type: string; count: number }[]
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
    }
  }
}

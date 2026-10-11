import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { computeHealthScore, scoreToStatus } from '@/lib/scoring'

export async function GET(request: NextRequest) {
  try {
    const inspections = await prisma.inspection.findMany({
      orderBy: { date: 'desc' },
      include: {
        road: { select: { name: true } },
        inspector: { select: { name: true } }
      }
    })
    return NextResponse.json(inspections)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const road = await prisma.road.findUnique({ where: { id: data.roadId } })
    if (!road) {
      return NextResponse.json({ error: 'Road not found' }, { status: 404 })
    }

    const inspection = await prisma.inspection.create({
      data: {
        roadId: data.roadId,
        inspectorId: session.user.id,
        imageUrl: data.imageUrl,
        aiScore: data.aiScore,
        damageTypes: data.damageTypes ? JSON.stringify(data.damageTypes) : "[]",
        severityLevel: data.severityLevel || 'LOW',
        notes: data.notes,
        weatherCond: data.weatherCond,
        trafficLoad: data.trafficLoad,
        drainageObserved: data.drainageObserved || null,
        waterlogging: typeof data.waterlogging === 'boolean' ? data.waterlogging : null,
        causeAnalysis: data.causeAnalysis,
        maintenanceEst: data.maintenanceEst,
      }
    })

    // Recompute road health from its recent inspections (see src/lib/scoring.ts)
    const recentInspections = await prisma.inspection.findMany({
      where: { roadId: data.roadId },
      orderBy: { date: 'desc' },
      take: 10
    })
    const healthScore = computeHealthScore(recentInspections, road.lastRepairAt)

    await prisma.road.update({
      where: { id: data.roadId },
      data: {
        healthScore,
        status: scoreToStatus(healthScore),
        // A field observation is the latest truth about site conditions
        ...(data.drainageObserved && { drainageCondition: data.drainageObserved }),
        ...(typeof data.waterlogging === 'boolean' && { waterlogging: data.waterlogging }),
      }
    })
    
    return NextResponse.json(inspection)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

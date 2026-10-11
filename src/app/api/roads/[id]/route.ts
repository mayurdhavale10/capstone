import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { parseRoadSiteFields } from '@/lib/road-fields'
import { computeHealthScore, scoreToStatus } from '@/lib/scoring'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const road = await prisma.road.findUnique({
      where: { id: resolvedParams.id },
      include: {
        inspections: {
          orderBy: { date: 'desc' },
          include: { inspector: { select: { name: true } } }
        }
      }
    })
    
    if (!road) return NextResponse.json({ error: 'Road not found' }, { status: 404 })

    return NextResponse.json(road)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Update a road's site conditions and contract/warranty details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role === 'VIEWER') {
    return NextResponse.json({ error: 'Viewer accounts cannot edit roads.' }, { status: 403 })
  }

  const { id } = await params
  let fields
  try {
    fields = parseRoadSiteFields(await request.json())
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  try {
    const existing = await prisma.road.findUnique({ where: { id }, include: { inspections: true } })
    if (!existing) return NextResponse.json({ error: 'Road not found' }, { status: 404 })

    // A new repair date makes older inspections obsolete, so recompute health
    const lastRepairAt = 'lastRepairAt' in fields ? (fields.lastRepairAt as Date | null) : existing.lastRepairAt
    const healthScore = computeHealthScore(existing.inspections, lastRepairAt)

    const road = await prisma.road.update({
      where: { id },
      data: { ...fields, healthScore, status: scoreToStatus(healthScore) },
    })
    return NextResponse.json(road)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

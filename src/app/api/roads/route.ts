import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { parseRoadSiteFields } from '@/lib/road-fields'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    const where = status ? { status: status as any } : {}
    
    const includeInspections = searchParams.get('includeInspections') === 'true'
    
    const roads = await prisma.road.findMany({
      where,
      orderBy: { healthScore: 'asc' },
      include: {
        _count: {
          select: { inspections: true }
        },
        ...(includeInspections && {
          inspections: {
            orderBy: { date: 'asc' },
            include: { inspector: { select: { name: true } } }
          }
        })
      }
    })
    
    return NextResponse.json(roads)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (session && session.user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Viewer accounts cannot register roads. Please log in as an Admin or Inspector.' }, { status: 403 })
    }

    const data = await request.json()
    
    const road = await prisma.road.create({
      data: {
        name: data.name,
        location: data.location,
        city: data.city,
        state: data.state || '',
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        lengthKm: parseFloat(data.lengthKm),
        material: data.material,
        constructedAt: new Date(data.constructedAt),
        trafficVolume: data.trafficVolume,
        description: data.description,
        ...parseRoadSiteFields(data),
      }
    })
    
    return NextResponse.json(road)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { analyzeRoadImage } from '@/lib/roboflow'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    if (!data.image) {
      return NextResponse.json({ error: 'Image base64 is required' }, { status: 400 })
    }

    // Extract base64 part if it contains data:image/...
    const base64Image = data.image.split(',')[1] || data.image
    const result = await analyzeRoadImage(base64Image)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('AI Analysis Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze image' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import * as positionService from '@/lib/services/position-service'

export async function GET() {
  try {
    const positions = await positionService.getPositions()
    return NextResponse.json(positions)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

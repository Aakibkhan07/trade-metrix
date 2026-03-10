import { NextRequest, NextResponse } from 'next/server'
import * as positionService from '@/lib/services/position-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const position = await positionService.getPosition(id)
    return NextResponse.json(position)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

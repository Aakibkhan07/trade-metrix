import { NextRequest, NextResponse } from 'next/server'
import * as positionService from '@/lib/services/position-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { exitPrice } = body

    if (!exitPrice) {
      return NextResponse.json(
        { error: 'exitPrice is required' },
        { status: 400 }
      )
    }

    const position = await positionService.closePosition(id, exitPrice)
    return NextResponse.json(position)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

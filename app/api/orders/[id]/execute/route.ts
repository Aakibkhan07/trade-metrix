import { NextRequest, NextResponse } from 'next/server'
import * as orderService from '@/lib/services/order-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { actualPrice } = body

    if (!actualPrice) {
      return NextResponse.json(
        { error: 'actualPrice is required' },
        { status: 400 }
      )
    }

    const result = await orderService.executeOrder(id, actualPrice)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

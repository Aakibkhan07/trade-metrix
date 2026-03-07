import { NextRequest, NextResponse } from 'next/server'
import * as orderService from '@/lib/services/order-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await orderService.cancelOrder(id)
    return NextResponse.json(order)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

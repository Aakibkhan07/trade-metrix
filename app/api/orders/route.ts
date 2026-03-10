import { NextRequest, NextResponse } from 'next/server'
import * as orderService from '@/lib/services/order-service'

export async function GET() {
  try {
    const orders = await orderService.getOrders()
    return NextResponse.json(orders)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const order = await orderService.createOrder(body)
    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

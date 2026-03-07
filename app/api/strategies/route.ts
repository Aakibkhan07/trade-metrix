import { NextRequest, NextResponse } from 'next/server'
import * as strategyService from '@/lib/services/strategy-service'

export async function GET() {
  try {
    const strategies = await strategyService.getStrategies()
    return NextResponse.json(strategies)
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
    const strategy = await strategyService.createStrategy(body)
    return NextResponse.json(strategy, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

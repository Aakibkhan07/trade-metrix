import { NextRequest, NextResponse } from 'next/server'
import * as strategyService from '@/lib/services/strategy-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const strategy = await strategyService.deactivateStrategy(id)
    return NextResponse.json(strategy)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

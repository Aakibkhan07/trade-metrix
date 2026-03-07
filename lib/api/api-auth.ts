import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from './api-key-service'
import { checkRateLimit } from './rate-limiter'

export async function authenticateApiRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 }
  }

  const token = authHeader.slice(7)
  const apiKeyData = await verifyApiKey(token)

  if (!apiKeyData) {
    return { error: 'Invalid API key', status: 401 }
  }

  return { userId: apiKeyData.userId, scopes: apiKeyData.scopes }
}

export function checkScope(scopes: string[], requiredScope: string): boolean {
  return scopes.includes('*') || scopes.includes(requiredScope)
}

export async function withApiAuth(
  request: NextRequest,
  handler: (userId: string, scopes: string[]) => Promise<NextResponse>,
) {
  try {
    const auth = await authenticateApiRequest(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    return await handler(auth.userId, auth.scopes)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

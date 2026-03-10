import { createClient } from '@/lib/supabase/server'

export async function checkRateLimit(userId: string, apiKeyId: string): Promise<boolean> {
  const supabase = await createClient()
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // Get rate limit for this API key
  const { data: keyData } = await supabase
    .from('api_keys')
    .select('rate_limit')
    .eq('id', apiKeyId)
    .single()

  if (!keyData) return false

  // Count requests in last hour
  const { count, error } = await supabase
    .from('api_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', oneHourAgo.toISOString())

  if (error) return false

  return (count || 0) < keyData.rate_limit
}

export async function logApiUsage(
  userId: string,
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('api_usage_logs').insert({
    user_id: userId,
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTime,
  })
}

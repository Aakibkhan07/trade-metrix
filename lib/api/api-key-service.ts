import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export interface ApiKey {
  id: string
  key: string
  name: string
  scopes: string[]
  rate_limit: number
  active: boolean
  created_at: string
  last_used_at: string | null
}

export async function generateApiKey(userId: string, name: string, scopes: string[] = ['read']): Promise<ApiKey> {
  const supabase = await createClient()
  const rawKey = crypto.randomBytes(32).toString('hex')
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex')

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: hashedKey,
      scopes,
      rate_limit: 1000,
      active: true,
    })
    .select()
    .single()

  if (error) throw error

  return { ...data, key: rawKey }
}

export async function verifyApiKey(key: string): Promise<{ userId: string; scopes: string[] } | null> {
  const supabase = await createClient()
  const hashedKey = crypto.createHash('sha256').update(key).digest('hex')

  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id, scopes, active')
    .eq('key_hash', hashedKey)
    .single()

  if (error || !data?.active) return null

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', hashedKey)

  return { userId: data.user_id, scopes: data.scopes }
}

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('api_keys')
    .update({ active: false })
    .eq('id', keyId)
    .eq('user_id', userId)

  if (error) throw error
}

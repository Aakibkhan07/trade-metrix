import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// OAuth callback handler for broker redirects
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestToken = searchParams.get('request_token');
  const status = searchParams.get('status');
  const state = searchParams.get('state');
  const code = searchParams.get('code'); // For Angel One
  const authToken = searchParams.get('auth_token'); // For Shoonya/Alice Blue
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trademetrix.tech';
  
  console.log('[v0] Broker callback received:', { requestToken, status, state, code, authToken });
  
  try {
    const supabase = await createClient();
    
    // Verify state token from broker_sessions table
    if (!state) {
      return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=missing_state`);
    }
    
    const { data: session, error: sessionError } = await supabase
      .from('broker_sessions')
      .select('*')
      .eq('state_token', state)
      .eq('status', 'pending')
      .single();
    
    if (sessionError || !session) {
      console.log('[v0] Invalid or expired state token');
      return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=invalid_state`);
    }
    
    // Check if session is expired (10 minutes)
    const sessionAge = Date.now() - new Date(session.created_at).getTime();
    if (sessionAge > 10 * 60 * 1000) {
      return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=session_expired`);
    }
    
    // Handle based on broker type
    let accessToken = '';
    let refreshToken = '';
    let tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours
    
    switch (session.broker_type) {
      case 'zerodha':
        if (status !== 'success' || !requestToken) {
          return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=zerodha_auth_failed`);
        }
        // Exchange request token for access token
        const zerodhaResult = await exchangeZerodhaToken(requestToken, session.api_key);
        accessToken = zerodhaResult.access_token;
        break;
        
      case 'angel_one':
        if (!code) {
          return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=angel_auth_failed`);
        }
        const angelResult = await exchangeAngelToken(code, session.api_key);
        accessToken = angelResult.jwtToken;
        refreshToken = angelResult.refreshToken;
        break;
        
      case 'shoonya':
      case 'alice_blue':
        if (!authToken) {
          return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=broker_auth_failed`);
        }
        accessToken = authToken;
        break;
        
      default:
        return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=unknown_broker`);
    }
    
    // Get broker ID
    const { data: broker } = await supabase
      .from('brokers')
      .select('id')
      .eq('broker_type', session.broker_type)
      .single();
    
    if (!broker) {
      return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=broker_not_found`);
    }
    
    // Store encrypted tokens in user_broker_accounts
    const encryptedToken = Buffer.from(accessToken).toString('base64');
    const encryptedRefresh = refreshToken ? Buffer.from(refreshToken).toString('base64') : null;
    
    const { error: upsertError } = await supabase
      .from('user_broker_accounts')
      .upsert({
        user_id: session.user_id,
        broker_id: broker.id,
        client_id: session.client_id,
        access_token_encrypted: encryptedToken,
        refresh_token_encrypted: encryptedRefresh,
        token_expires_at: tokenExpiry.toISOString(),
        connection_status: 'connected',
        last_connected_at: new Date().toISOString(),
      });
    
    if (upsertError) {
      console.log('[v0] Error storing broker credentials:', upsertError);
      return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=storage_failed`);
    }
    
    // Update session status
    await supabase
      .from('broker_sessions')
      .update({ status: 'completed' })
      .eq('id', session.id);
    
    console.log('[v0] Broker connected successfully:', session.broker_type);
    return NextResponse.redirect(`${baseUrl}/dashboard/brokers?success=connected&broker=${session.broker_type}`);
    
  } catch (error) {
    console.log('[v0] Callback error:', error);
    return NextResponse.redirect(`${baseUrl}/dashboard/brokers?error=callback_failed`);
  }
}

// Zerodha token exchange
async function exchangeZerodhaToken(requestToken: string, apiKey: string): Promise<{ access_token: string }> {
  const apiSecret = process.env.ZERODHA_API_SECRET;
  
  if (!apiSecret) {
    throw new Error('ZERODHA_API_SECRET not configured');
  }
  
  // Create checksum: SHA256(api_key + request_token + api_secret)
  const crypto = await import('crypto');
  const checksum = crypto
    .createHash('sha256')
    .update(apiKey + requestToken + apiSecret)
    .digest('hex');
  
  const response = await fetch('https://api.kite.trade/session/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Kite-Version': '3',
    },
    body: new URLSearchParams({
      api_key: apiKey,
      request_token: requestToken,
      checksum: checksum,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to exchange Zerodha token');
  }
  
  const data = await response.json();
  return { access_token: data.data.access_token };
}

// Angel One token exchange
async function exchangeAngelToken(code: string, apiKey: string): Promise<{ jwtToken: string; refreshToken: string }> {
  const apiSecret = process.env.ANGEL_ONE_API_SECRET;
  
  if (!apiSecret) {
    throw new Error('ANGEL_ONE_API_SECRET not configured');
  }
  
  const response = await fetch('https://apiconnect.angelbroking.com/rest/auth/angelbroking/jwt/v1/generateTokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PrivateKey': apiKey,
    },
    body: JSON.stringify({
      refreshToken: code,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to exchange Angel One token');
  }
  
  const data = await response.json();
  return {
    jwtToken: data.data.jwtToken,
    refreshToken: data.data.refreshToken,
  };
}

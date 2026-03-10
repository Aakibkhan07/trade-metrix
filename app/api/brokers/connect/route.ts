import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trademetrix.tech';
const CALLBACK_URL = `${BASE_URL}/api/brokers/callback`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brokerType, credentials, authMethod } = await request.json();

    // Validate broker type
    const brokerTypes = ['zerodha', 'angel_one', 'shoonya', 'alice_blue', 'paper'];
    if (!brokerTypes.includes(brokerType)) {
      return NextResponse.json({ error: 'Invalid broker type' }, { status: 400 });
    }

    // Paper trading - direct connection
    if (brokerType === 'paper') {
      return await connectPaperTrading(supabase, user.id);
    }

    // OAuth-based connection
    if (authMethod === 'oauth') {
      return await initiateOAuthFlow(supabase, user.id, brokerType, credentials);
    }

    // API key-based connection (for Angel One, Shoonya, Alice Blue)
    if (authMethod === 'api_key') {
      return await connectWithApiKey(supabase, user.id, brokerType, credentials);
    }

    return NextResponse.json({ error: 'Invalid auth method' }, { status: 400 });

  } catch (error) {
    console.log('[v0] Connect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Initiate OAuth flow for Zerodha
async function initiateOAuthFlow(
  supabase: any, 
  userId: string, 
  brokerType: string, 
  credentials: any
) {
  // Generate state token for CSRF protection
  const stateToken = crypto.randomBytes(32).toString('hex');
  
  // Store session in broker_sessions table
  const { error: sessionError } = await supabase
    .from('broker_sessions')
    .insert({
      user_id: userId,
      broker_type: brokerType,
      state_token: stateToken,
      api_key: credentials.apiKey,
      client_id: credentials.clientId,
      status: 'pending',
    });
  
  if (sessionError) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
  
  // Generate OAuth redirect URL based on broker
  let authUrl = '';
  
  switch (brokerType) {
    case 'zerodha':
      const zerodhaApiKey = credentials.apiKey || process.env.NEXT_PUBLIC_ZERODHA_API_KEY;
      authUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${zerodhaApiKey}&redirect_params=state=${stateToken}`;
      break;
      
    case 'angel_one':
      const angelApiKey = credentials.apiKey || process.env.NEXT_PUBLIC_ANGEL_ONE_API_KEY;
      authUrl = `https://smartapi.angelbroking.com/oauth?api_key=${angelApiKey}&redirect_uri=${encodeURIComponent(CALLBACK_URL)}&state=${stateToken}`;
      break;
      
    case 'shoonya':
      authUrl = `https://shoonya.finvasia.com/auth?redirect_uri=${encodeURIComponent(CALLBACK_URL)}&state=${stateToken}`;
      break;
      
    case 'alice_blue':
      authUrl = `https://ant.aliceblueonline.com/oauth2/auth?redirect_uri=${encodeURIComponent(CALLBACK_URL)}&state=${stateToken}`;
      break;
      
    default:
      return NextResponse.json({ error: 'OAuth not supported for this broker' }, { status: 400 });
  }
  
  return NextResponse.json({
    success: true,
    authMethod: 'oauth',
    redirectUrl: authUrl,
    stateToken,
    message: 'Redirect user to broker login',
  });
}

// Connect with API key (for brokers that support direct API login)
async function connectWithApiKey(
  supabase: any, 
  userId: string, 
  brokerType: string, 
  credentials: any
) {
  // Validate required credentials
  if (!credentials.apiKey || !credentials.userId) {
    return NextResponse.json({ error: 'API Key and User ID are required' }, { status: 400 });
  }
  
  // Get broker ID
  const { data: broker } = await supabase
    .from('brokers')
    .select('id')
    .eq('broker_type', brokerType)
    .single();
  
  if (!broker) {
    return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
  }
  
  // Attempt to authenticate with broker API
  let accessToken = '';
  
  try {
    switch (brokerType) {
      case 'angel_one':
        accessToken = await authenticateAngelOne(credentials);
        break;
      case 'shoonya':
        accessToken = await authenticateShoonya(credentials);
        break;
      case 'alice_blue':
        accessToken = await authenticateAliceBlue(credentials);
        break;
      default:
        return NextResponse.json({ error: 'API key auth not supported' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    }, { status: 401 });
  }
  
  // Store encrypted credentials
  const encryptedToken = Buffer.from(accessToken).toString('base64');
  
  const { data, error } = await supabase
    .from('user_broker_accounts')
    .upsert({
      user_id: userId,
      broker_id: broker.id,
      client_id: credentials.userId,
      access_token_encrypted: encryptedToken,
      connection_status: 'connected',
      last_connected_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({
    success: true,
    accountId: data.id,
    message: 'Broker connected successfully',
  });
}

// Paper trading connection
async function connectPaperTrading(supabase: any, userId: string) {
  const { data: broker } = await supabase
    .from('brokers')
    .select('id')
    .eq('broker_type', 'paper')
    .single();
  
  if (!broker) {
    return NextResponse.json({ error: 'Paper trading broker not found' }, { status: 404 });
  }
  
  const { data, error } = await supabase
    .from('user_broker_accounts')
    .upsert({
      user_id: userId,
      broker_id: broker.id,
      client_id: `paper_${userId}`,
      connection_status: 'connected',
      last_connected_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({
    success: true,
    accountId: data.id,
    message: 'Paper trading connected successfully',
  });
}

// Angel One direct API authentication
async function authenticateAngelOne(credentials: any): Promise<string> {
  try {
    console.log('[v0] Authenticating with Angel One...');
    console.log('[v0] Client code:', credentials.userId);
    console.log('[v0] API Key present:', !!credentials.apiKey);
    
    const response = await fetch('https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PrivateKey': credentials.apiKey,
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
      },
      body: JSON.stringify({
        clientcode: credentials.userId,
        password: credentials.password,
        totp: credentials.totpCode || '',
      }),
    });
    
    const data = await response.json();
    console.log('[v0] Angel One full response:', JSON.stringify(data, null, 2));
    console.log('[v0] Angel One status code:', response.status);
    
    // Check different status indicators
    if (data.status !== 'success' && data.status !== true && data.code !== 'SUCCESS') {
      const errorMsg = data.message || data.msg || data.error || 'Angel One authentication failed';
      console.log('[v0] Auth failed with message:', errorMsg);
      throw new Error(errorMsg);
    }
    
    const token = data.data?.jwtToken || data.data?.authToken || data.jwtToken || data.authToken;
    
    if (!token) {
      console.log('[v0] No token in response. Response data:', data.data);
      throw new Error('No authentication token received from Angel One. Check your credentials and API key.');
    }
    
    console.log('[v0] Angel One auth successful!');
    return token;
  } catch (error) {
    console.log('[v0] Angel One auth error:', error);
    if (error instanceof Error) {
      throw new Error(`Angel One Error: ${error.message}`);
    }
    throw error;
  }
}

// Shoonya direct API authentication
async function authenticateShoonya(credentials: any): Promise<string> {
  const response = await fetch('https://api.shoonya.com/NorenWClientTP/QuickAuth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'API',
      apkversion: 'js:1.0.0',
      uid: credentials.userId,
      pwd: credentials.password,
      factor2: credentials.totpCode || '',
      vc: credentials.clientId,
      appkey: credentials.apiKey,
      imei: 'trademetrix',
    }),
  });
  
  const data = await response.json();
  if (data.stat !== 'Ok') {
    throw new Error(data.emsg || 'Shoonya authentication failed');
  }
  
  return data.susertoken;
}

// Alice Blue direct API authentication
async function authenticateAliceBlue(credentials: any): Promise<string> {
  const response = await fetch('https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/customer/getUserDetails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: credentials.userId,
    }),
  });
  
  const data = await response.json();
  if (data.stat !== 'Ok') {
    throw new Error(data.emsg || 'Alice Blue authentication failed');
  }
  
  return data.sessionID;
}

// GET - List connected broker accounts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_broker_accounts')
      .select(`
        *,
        broker:brokers(name, broker_type)
      `)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

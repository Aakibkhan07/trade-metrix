import { createClient } from '@/lib/supabase/server';
import { brokerService } from '@/lib/brokers/broker-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brokerAccountId, brokerType, symbol, exchange } = await request.json();

    // Get broker account and credentials
    const { data: account, error: accountError } = await supabase
      .from('user_broker_accounts')
      .select('*')
      .eq('id', brokerAccountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Broker account not found' }, { status: 404 });
    }

    // Decrypt and use credentials
    const credentials = JSON.parse(Buffer.from(account.access_token_encrypted, 'base64').toString());
    
    await brokerService.selectBroker(brokerType, credentials);
    const quote = await brokerService.getQuote(symbol, exchange);

    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

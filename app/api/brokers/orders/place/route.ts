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

    const { brokerAccountId, brokerType, symbol, exchange, orderType, quantity, price, triggerPrice, orderVariety, timeInForce, productType } = await request.json();

    // Validate required fields
    if (!symbol || !exchange || !orderType || !quantity) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    // Get broker account
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
    
    const orderResponse = await brokerService.placeOrder({
      symbol,
      exchange,
      orderType,
      quantity: parseInt(quantity),
      price: price ? parseFloat(price) : undefined,
      triggerPrice: triggerPrice ? parseFloat(triggerPrice) : undefined,
      orderVariety: orderVariety || 'regular',
      timeInForce: timeInForce || 'DAY',
      productType: productType || 'MIS',
    });

    // Store order in database
    const { error: storeError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        strategy_id: null, // If from a strategy, pass it here
        broker_account_id: brokerAccountId,
        broker_order_id: orderResponse.brokerOrderId,
        symbol: orderResponse.symbol,
        order_type: orderType,
        quantity: orderResponse.quantity,
        price: orderResponse.price,
        status: 'PENDING',
        exchange,
      });

    if (storeError) {
      console.error('Error storing order:', storeError);
    }

    return NextResponse.json(orderResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

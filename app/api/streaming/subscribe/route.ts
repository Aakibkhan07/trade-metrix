// Subscription management API routes
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { subscriptionManager } from '@/lib/streaming/subscription-manager';

// Subscribe to streaming data
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brokerAccountId, dataType, filters } = await request.json();

  try {
    const subscription = await subscriptionManager.createSubscription(
      user.id,
      brokerAccountId,
      dataType,
      filters
    );

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('[Subscription] Error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

// Get all subscriptions for user
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: subscriptions } = await supabase
    .from('streaming_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true);

  return NextResponse.json(subscriptions || []);
}

// Cancel subscription
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const subscriptionId = searchParams.get('id');

  if (!subscriptionId) {
    return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 });
  }

  try {
    await subscriptionManager.cancelSubscription(subscriptionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Subscription] Cancel error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}

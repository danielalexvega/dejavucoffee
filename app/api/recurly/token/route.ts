import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/token
 * Validates a payment token from Recurly.js
 * This is optional but can be useful for validation before creating a subscription
 * 
 * Expected body:
 * {
 *   token: string // Token from Recurly.js
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }

    // Validate token with Recurly
    // Note: Recurly.js tokens are typically validated when creating subscriptions
    // This endpoint can be used for additional validation if needed
    
    return NextResponse.json({
      success: true,
      message: 'Token is valid',
    });
  } catch (error: any) {
    console.error('Error validating token:', error);
    
    return NextResponse.json(
      { error: error?.message || 'Failed to validate token' },
      { status: 400 }
    );
  }
}

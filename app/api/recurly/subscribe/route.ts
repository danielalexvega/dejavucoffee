import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/subscribe
 * Creates a new subscription in Recurly
 * 
 * Expected body:
 * {
 *   planCode: string,
 *   account: { email: string, firstName?: string, lastName?: string },
 *   billingInfo: { 
 *     token: string, // Token from Recurly.js
 *     address?: string,
 *     city?: string,
 *     state?: string,
 *     zip?: string,
 *     country?: string
 *   },
 *   shippingAddress: {
 *     firstName: string,
 *     lastName: string,
 *     address: string,
 *     city: string,
 *     state: string,
 *     zip: string,
 *     country: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  // Declare variables that might be used in catch block
  let planCode: string | undefined;
  let account: any;
  let billingInfo: any;
  let shippingAddress: any;
  let accountCode: string | undefined;
  let accountId: string | undefined;
  let billingInfoPayload: any;
  let shippingAddressId: string | undefined;

  try {
    if (!recurlyClient) {
      return NextResponse.json(
        { error: 'Recurly API key not configured. Please set RECURLY_PRIVATE_KEY environment variable.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    planCode = body.planCode;
    account = body.account;
    billingInfo = body.billingInfo;
    shippingAddress = body.shippingAddress;

    console.log('Received subscription request:', {
      planCode,
      account: { email: account?.email, firstName: account?.firstName, lastName: account?.lastName },
      billingInfo: {
        hasToken: !!billingInfo?.token,
        address: billingInfo?.address,
        city: billingInfo?.city,
        state: billingInfo?.state,
        zip: billingInfo?.zip,
        country: billingInfo?.country,
      },
      shippingAddress: {
        address: shippingAddress?.address,
        city: shippingAddress?.city,
        state: shippingAddress?.state,
        zip: shippingAddress?.zip,
        country: shippingAddress?.country,
      },
    });

    if (!planCode || !account?.email || !billingInfo?.token) {
      return NextResponse.json(
        { error: 'Missing required fields: planCode, account.email, and billingInfo.token' },
        { status: 400 }
      );
    }

    // Validate that all required billing address fields are provided
    if (!billingInfo.address || !billingInfo.city || !billingInfo.state || !billingInfo.zip || !billingInfo.country) {
      return NextResponse.json(
        { error: 'All billing address fields are required: address, city, state, zip, and country' },
        { status: 400 }
      );
    }

    // Validate that all required shipping address fields are provided
    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip || !shippingAddress.country) {
      return NextResponse.json(
        { error: 'All shipping address fields are required: address, city, state, zip, and country' },
        { status: 400 }
      );
    }

    // Check if account already exists by email
    let existingAccount = null;
    try {
      const accountsResponse = recurlyClient.listAccounts({
        params: {
          email: account.email,
        },
      });

      // Iterate through accounts to find matching email
      if (accountsResponse && typeof accountsResponse.each === 'function') {
        for await (const acc of accountsResponse.each()) {
          if (acc.email === account.email) {
            existingAccount = acc;
            break;
          }
        }
      }
    } catch (error: any) {
      console.error('Error checking for existing account:', error);
      // Continue with account creation if lookup fails
    }

    // accountId and accountCode are already declared at function scope

    if (existingAccount) {
      // Use existing account
      accountId = existingAccount.id;
      accountCode = existingAccount.code;
      console.log('Using existing account:', accountCode);
    } else {
      // Create new account
      accountCode = `acc-${account.email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}`;
      console.log('Creating new account:', accountCode);
      
      const newAccount = await recurlyClient.createAccount({
        code: accountCode,
        email: account.email,
        firstName: account.firstName || undefined,
        lastName: account.lastName || undefined,
      });
      
      accountId = newAccount.id;
      console.log('Created new account with ID:', accountId);
    }

    // Check for existing shipping addresses and compare with new address
    // Normalize address fields for comparison (trim whitespace, lowercase)
    const normalizeAddress = (addr: any) => ({
      firstName: (addr.firstName || '').trim().toLowerCase(),
      lastName: (addr.lastName || '').trim().toLowerCase(),
      street1: (addr.street1 || addr.address || '').trim().toLowerCase(),
      city: (addr.city || '').trim().toLowerCase(),
      region: (addr.region || addr.state || '').trim().toLowerCase(),
      postalCode: (addr.postalCode || addr.zip || '').trim().toLowerCase(),
      country: (addr.country || '').trim().toLowerCase(),
    });

    const newAddressNormalized = normalizeAddress({
      firstName: shippingAddress.firstName,
      lastName: shippingAddress.lastName,
      address: shippingAddress.address,
      city: shippingAddress.city,
      state: shippingAddress.state,
      zip: shippingAddress.zip,
      country: shippingAddress.country,
    });

    // List existing shipping addresses for the account
    let existingShippingAddressId: string | null = null;
    try {
      console.log('Checking for existing shipping addresses for account:', accountId);
      const addressesResponse = recurlyClient.listShippingAddresses(accountId, {
        params: { limit: 200 },
      });

      // Iterate through existing addresses to find a match
      if (addressesResponse && typeof addressesResponse.each === 'function') {
        for await (const existingAddr of addressesResponse.each()) {
          const existingAddrNormalized = normalizeAddress(existingAddr);
          
          // Compare all address fields
          if (
            existingAddrNormalized.firstName === newAddressNormalized.firstName &&
            existingAddrNormalized.lastName === newAddressNormalized.lastName &&
            existingAddrNormalized.street1 === newAddressNormalized.street1 &&
            existingAddrNormalized.city === newAddressNormalized.city &&
            existingAddrNormalized.region === newAddressNormalized.region &&
            existingAddrNormalized.postalCode === newAddressNormalized.postalCode &&
            existingAddrNormalized.country === newAddressNormalized.country
          ) {
            existingShippingAddressId = existingAddr.id;
            console.log('Found matching shipping address, reusing ID:', existingShippingAddressId);
            break;
          }
        }
      }
    } catch (error: any) {
      console.error('Error checking for existing shipping addresses:', error);
      // Continue with creating new address if lookup fails
    }

    // shippingAddressId is already declared at function scope

    if (existingShippingAddressId) {
      // Reuse existing shipping address
      shippingAddressId = existingShippingAddressId;
      console.log('Reusing existing shipping address ID:', shippingAddressId);
    } else {
      // Create new shipping address
      console.log('No matching shipping address found, creating new one for account:', accountId);
      const shippingAddressData = {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        street1: shippingAddress.address,
        city: shippingAddress.city,
        region: shippingAddress.state,
        postalCode: shippingAddress.zip,
        country: shippingAddress.country,
      };

      const createdShippingAddress = await recurlyClient.createShippingAddress(accountId, shippingAddressData);
      shippingAddressId = createdShippingAddress.id;
      console.log('Created new shipping address with ID:', shippingAddressId);
    }

    // Build billingInfo object with token only
    // When using a token, address information is already included in the token
    // (passed during tokenization in the frontend), so we don't need to include it here
    const billingInfoPayload: any = {
      tokenId: billingInfo.token,
    };

    console.log('Creating subscription with billingInfo and shippingAddressId:', {
      tokenId: '***',
      shippingAddressId,
      accountCode,
      note: 'Address info is included in the token',
    });

    // Create subscription using Recurly API
    // Recurly Client v4 uses createSubscription() method directly
    // billingInfo must be nested inside account object, not as top-level parameter
    const subscription = await recurlyClient.createSubscription({
      planCode,
      account: {
        code: accountCode, // Account code (existing or new)
        email: account.email,
        firstName: account.firstName || undefined,
        lastName: account.lastName || undefined,
        billingInfo: billingInfoPayload,
      },
      currency: 'USD', // Adjust based on your needs
    });

    console.log('Subscription created successfully:', {
      uuid: subscription.uuid,
      id: subscription.id,
      state: subscription.state,
      hasShippingAddress: !!subscription.shippingAddress,
      subscriptionKeys: Object.keys(subscription),
    });

    // Wait a moment for subscription to be fully available before updating
    // Sometimes there's a slight delay between creation and availability
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update subscription to add shipping address
    // shippingAddressId must be set after subscription creation
    // Try using UUID first, then ID if UUID doesn't work
    let updatedSubscription = null;
    let updateError = null;
    
    // Try with UUID first
    try {
      console.log('Attempting to update subscription with UUID:', subscription.uuid);
      updatedSubscription = await recurlyClient.updateSubscription(subscription.uuid, {
        shippingAddressId: shippingAddressId,
      });
      console.log('Subscription updated successfully with UUID');
    } catch (uuidError: any) {
      console.log('Update with UUID failed, trying with ID:', uuidError?.message);
      updateError = uuidError;
      
      // If UUID fails and we have an ID, try with ID
      if (subscription.id && subscription.id !== subscription.uuid) {
        try {
          console.log('Attempting to update subscription with ID:', subscription.id);
          updatedSubscription = await recurlyClient.updateSubscription(subscription.id, {
            shippingAddressId: shippingAddressId,
          });
          console.log('Subscription updated successfully with ID');
          updateError = null;
        } catch (idError: any) {
          console.error('Update with ID also failed:', idError?.message);
          updateError = idError;
        }
      }
    }

    if (updatedSubscription) {
      return NextResponse.json({
        success: true,
        subscription: {
          uuid: updatedSubscription.uuid || subscription.uuid,
          state: updatedSubscription.state || subscription.state,
          plan: updatedSubscription.plan || subscription.plan,
          account: updatedSubscription.account || subscription.account,
        },
      });
    } else {
      // If update fails, still return success with the created subscription
      // The shipping address can be added later if needed
      console.warn('Shipping address update failed, but subscription was created successfully');
      console.error('Update error details:', updateError?.message, updateError?.params);
      
      return NextResponse.json({
        success: true,
        subscription: {
          uuid: subscription.uuid,
          state: subscription.state,
          plan: subscription.plan,
          account: subscription.account,
        },
        warning: 'Subscription created successfully, but shipping address could not be updated. You may need to update it manually in Recurly.',
        updateError: updateError?.message || 'Unknown error',
      });
    }
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    
    // Handle duplicate subscription error specifically
    // If the error is about duplicate subscription, try with a future renewal date
    // Only retry if we have all the required variables (meaning we got past validation)
    if ((error?.message?.includes('already have a subscription to this plan') || 
        error?.message?.includes('duplicate subscription')) &&
        planCode && accountCode && billingInfoPayload && shippingAddressId) {
      console.log('Duplicate subscription detected, retrying with future renewal date');
      
      try {
        // Calculate a future renewal date (30 days from now) to make subscription unique
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const futureRenewalDate = futureDate.toISOString().split('T')[0];
        
        const subscription = await recurlyClient.createSubscription({
          planCode,
          account: {
            code: accountCode,
            email: account.email,
            firstName: account.firstName || undefined,
            lastName: account.lastName || undefined,
            billingInfo: billingInfoPayload,
          },
          currency: 'USD',
          firstRenewalDate: futureRenewalDate, // Set future renewal date to allow duplicate
        });

        // Update subscription to add shipping address
        const subscriptionId = subscription.id || subscription.uuid;
        
        try {
          const updatedSubscription = await recurlyClient.updateSubscription(subscriptionId, {
            shippingAddressId: shippingAddressId,
          });

          return NextResponse.json({
            success: true,
            subscription: {
              uuid: updatedSubscription.uuid || subscription.uuid,
              state: updatedSubscription.state || subscription.state,
              plan: updatedSubscription.plan || subscription.plan,
              account: updatedSubscription.account || subscription.account,
            },
          });
        } catch (updateError: any) {
          console.error('Error updating subscription with shipping address in retry:', updateError);
          // If update fails, still return success with the created subscription
          return NextResponse.json({
            success: true,
            subscription: {
              uuid: subscription.uuid,
              state: subscription.state,
              plan: subscription.plan,
              account: subscription.account,
            },
            warning: 'Subscription created but shipping address update failed.',
          });
        }
      } catch (retryError: any) {
        console.error('Error retrying subscription creation:', retryError);
        // If retry also fails, return the original error
        return NextResponse.json(
          { 
            error: 'Failed to create subscription. Please contact support if you need multiple subscriptions to the same plan.',
            details: retryError?.message || retryError 
          },
          { status: 400 }
        );
      }
    }
    
    // Handle Recurly-specific errors with more detail
    if (error?.message) {
      // Recurly API errors often have more details in error object
      const errorDetails = error?.params || error?.fields || {};
      const errorMessage = error.message + (Object.keys(errorDetails).length > 0 
        ? ` Details: ${JSON.stringify(errorDetails)}` 
        : '');
      
      return NextResponse.json(
        { error: errorMessage, details: errorDetails },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subscription', details: error },
      { status: 500 }
    );
  }
}

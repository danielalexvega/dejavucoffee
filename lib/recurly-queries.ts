import { recurlyClient } from './recurly';

/**
 * Fetch all plans from Recurly
 */
export async function getAllRecurlyPlans() {
  if (!recurlyClient) {
    console.warn('Recurly client not initialized. Check RECURLY_PRIVATE_KEY environment variable.');
    return [];
  }

  try {
    // Recurly Client v4 uses listPlans() method directly
    // Parameters must be wrapped in 'params' object
    // The response is an iterator, so we need to iterate through it
    const plansResponse = await recurlyClient.listPlans({ params: { limit: 200 } });
    
    const plans: any[] = [];
    // Iterate through the response using .each() method
    if (plansResponse && typeof plansResponse.each === 'function') {
      for await (const plan of plansResponse.each()) {
        plans.push(plan);
      }
    } else {
      console.error('Plans response does not have .each() method. Response:', plansResponse);
    }
    
    return plans;
  } catch (error: any) {
    console.error('Error fetching all Recurly plans:', {
      message: error?.message,
      status: error?.status,
      statusCode: error?.statusCode,
      error: error,
      stack: error?.stack,
    });
    return [];
  }
}

/**
 * Fetch plan details from Recurly by plan code
 */
export async function getRecurlyPlan(planCode: string) {
  if (!recurlyClient) {
    console.warn('Recurly client not initialized. Check RECURLY_PRIVATE_KEY environment variable.');
    return null;
  }

  try {
    // Recurly Client v4 uses getPlan() method directly
    // Plan codes need to be prefixed with "code-" (e.g., "code-gold")
    // Plan IDs don't need a prefix
    // Try with code- prefix first (most common case)
    const planId = planCode.startsWith('code-') ? planCode : `code-${planCode}`;
    const plan = await recurlyClient.getPlan(planId);
    return plan;
  } catch (error: any) {
    // If code- prefix failed, try without prefix (in case it's a plan ID)
    if (!planCode.startsWith('code-')) {
      try {
        const plan = await recurlyClient.getPlan(planCode);
        return plan;
      } catch (secondError: any) {
        // Both attempts failed
        const errorMessage = secondError?.message || String(secondError);
        if (errorMessage.includes("Couldn't find Plan") || errorMessage.includes('not found')) {
          return null;
        }
        console.error(`Error fetching Recurly plan ${planCode}:`, errorMessage);
        return null;
      }
    }
    
    // Check if it's a "not found" error (which is okay - plan might not exist in Recurly)
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("Couldn't find Plan") || errorMessage.includes('not found')) {
      return null;
    }
    // Log other errors (API key issues, network errors, etc.)
    console.error(`Error fetching Recurly plan ${planCode}:`, errorMessage);
    return null;
  }
}

/**
 * Fetch multiple plans from Recurly by plan codes
 */
export async function getRecurlyPlans(planCodes: string[]) {
  try {
    // Fetch plans in parallel
    const planPromises = planCodes.map((code) => getRecurlyPlan(code));
    const plans = await Promise.all(planPromises);
    
    // Create a map of planCode -> plan for easy lookup
    const planMap = new Map();
    plans.forEach((plan, index) => {
      if (plan) {
        planMap.set(planCodes[index], plan);
      }
    });
    
    return planMap;
  } catch (error) {
    console.error('Error fetching Recurly plans:', error);
    return new Map();
  }
}

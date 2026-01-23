// TypeScript types for Recurly integration

export interface RecurlyAccount {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface RecurlyBillingInfo {
  token: string;
}

export interface CreateSubscriptionRequest {
  planCode: string;
  account: RecurlyAccount;
  billingInfo: RecurlyBillingInfo;
}

export interface SubscriptionResponse {
  success: boolean;
  subscription?: {
    uuid: string;
    state: string;
    plan: any;
    account: any;
  };
  error?: string;
}

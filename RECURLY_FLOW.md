# How Recurly.js Payment Flow Works

## Overview
Recurly.js is a client-side JavaScript library that securely collects payment information and tokenizes it before sending to your server. This ensures sensitive card data never touches your server directly.

## The Complete Flow

### 1. **Load Recurly.js Script** (`app/layout.tsx`)
```typescript
<Script
  src="https://js.recurly.com/v4/recurly.js"
  strategy="beforeInteractive"
/>
```
- The Recurly.js script is loaded from Recurly's CDN
- `strategy="beforeInteractive"` ensures it loads early, before the page becomes interactive
- This makes `window.Recurly` (or `window.recurly`) available globally

### 2. **Initialize Recurly Instance** (`components/RecurlyProvider.tsx`)
```typescript
const recurlyInstance = new Recurly({ publicKey: 'your-public-key' });
```
- Creates a Recurly instance configured with your public key
- The public key is safe to expose in client-side code (it's different from your private API key)
- This instance is used to create payment form Elements

### 3. **Create Payment Form Elements** (`components/CheckoutForm.tsx`)
```typescript
const elements = recurlyInstance.Elements();
const cardNumber = elements.CardNumberElement();
const cardMonth = elements.CardMonthElement();
const cardYear = elements.CardYearElement();
const cardCvv = elements.CardCvvElement();

// Attach to DOM elements
cardNumber.attach(cardNumberRef.current);
cardMonth.attach(expirationMonthRef.current);
cardYear.attach(expirationYearRef.current);
cardCvv.attach(cvvRef.current);
```

**What happens here:**
- `Elements()` creates a container for all payment form fields
- Each `*Element()` creates an iframe that securely handles card input
- The iframes are PCI-compliant and handle validation, formatting, and security
- When attached to DOM elements, they render secure payment inputs
- Card data is **never** accessible to your JavaScript code

### 4. **User Fills Out Payment Form**
- User enters card number, expiration, and CVV
- Recurly.js Elements handle:
  - Real-time validation
  - Card number formatting (spaces, etc.)
  - Security (PCI compliance)
  - Error messages

### 5. **Tokenize Payment Information** (`components/CheckoutForm.tsx`)
```typescript
recurly.token(
  elementsInstance,  // The Elements instance
  {
    first_name: formData.firstName,
    last_name: formData.lastName,
  },
  (err, token) => {
    if (err) {
      // Handle validation errors
    } else {
      // Token created successfully
      // token.id is what you send to your server
    }
  }
);
```

**What happens here:**
- `recurly.token()` sends the payment data securely to Recurly's servers
- Recurly validates the card and creates a **payment token**
- The token is a one-time-use identifier that represents the payment method
- The token expires after a short time (usually 10 minutes)
- **Important:** The actual card number is never returned to your code

### 6. **Send Token to Your Backend** (`components/CheckoutForm.tsx`)
```typescript
const response = await fetch('/api/recurly/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    planCode: 'your-plan-code',
    account: {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    billingInfo: {
      token: token.id,  // The token from step 5
    },
  }),
});
```

**What happens here:**
- The token (not the card number) is sent to your Next.js API route
- This is safe because tokens can't be used outside your Recurly account
- Even if intercepted, tokens are useless without your private API key

### 7. **Create Subscription on Server** (`app/api/recurly/subscribe/route.ts`)
```typescript
const subscription = await recurlyClient.createSubscription({
  planCode: 'your-plan-code',
  account: {
    code: 'unique-account-code',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
  },
  currency: 'USD',
  billingInfo: {
    tokenId: token.id,  // Use the token here
  },
});
```

**What happens here:**
- Your server uses the **Recurly Node.js SDK** (server-side)
- Uses your **private API key** (never exposed to client)
- Recurly exchanges the token for the actual payment method
- Creates a subscription in Recurly
- Returns subscription details (UUID, state, etc.)

### 8. **Handle Response**
- Success: Redirect to success page, clear cart
- Error: Display error message to user

## Security Benefits

1. **PCI Compliance**: Card data never touches your servers
2. **Tokenization**: Sensitive data is replaced with secure tokens
3. **Validation**: Recurly validates cards before tokenization
4. **Fraud Protection**: Recurly handles fraud detection

## Key Files

- **`components/RecurlyProvider.tsx`**: Initializes Recurly.js client-side
- **`components/CheckoutForm.tsx`**: Creates Elements, tokenizes payment
- **`app/api/recurly/subscribe/route.ts`**: Server-side subscription creation
- **`lib/recurly.ts`**: Server-side Recurly client configuration

## Important Notes

1. **Public Key vs Private Key**:
   - Public key: Used in client-side code (safe to expose)
   - Private key: Only used server-side (never expose)

2. **Elements vs Token**:
   - Elements: Secure iframes for collecting payment data
   - Token: One-time-use identifier representing payment method

3. **Error Handling**:
   - Tokenization errors: Card validation failed (invalid card, expired, etc.)
   - Subscription errors: Account/plan issues (duplicate account, invalid plan, etc.)

4. **Multiple Subscriptions**:
   - Currently handles one subscription at a time
   - For multiple subscriptions, you'd need to:
     - Create multiple subscriptions sequentially, OR
     - Use Recurly's invoice API to combine multiple subscriptions

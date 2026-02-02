'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRecurly } from './RecurlyProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';

export function CheckoutForm() {
  const { recurly, isLoaded } = useRecurly();
  const router = useRouter();
  const { items, clearCart } = useCart();
  
  console.log('[CheckoutForm] Component render', { 
    hasRecurly: !!recurly, 
    isLoaded, 
    cartItems: items.length 
  });
  
  // Get the first item from cart (for now, we'll handle single item checkout)
  // TODO: Handle multiple items if needed
  const cartItem = items.length > 0 ? items[0] : null;
  const planCode = cartItem?.planCode || null;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    shippingSameAsBilling: true,
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: 'US',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementsReady, setElementsReady] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Wait for recurly to become available if script is loaded but instance isn't ready yet
  useEffect(() => {
    if (isLoaded && !recurly) {
      // Poll for recurly to become available (useRecurlyBase might return null initially)
      let attempts = 0;
      const maxAttempts = 500; // 5 seconds
      
      const checkInterval = setInterval(() => {
        attempts++;
        // Force re-render by updating formData (harmless update)
        // This will cause useRecurly to be called again
        setFormData(prev => ({ ...prev }));
        
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.warn('Recurly instance not available after 5 seconds');
        }
      }, 100);
      
      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [isLoaded, recurly]);

  const cardNumberRef = useRef<HTMLDivElement>(null);
  const expirationMonthRef = useRef<HTMLDivElement>(null);
  const expirationYearRef = useRef<HTMLDivElement>(null);
  const cvvRef = useRef<HTMLDivElement>(null);
  const elementsInstanceRef = useRef<any>(null);

  // Mount Recurly Elements when Recurly is loaded
  // Sync shipping address with billing address when checkbox is checked
  useEffect(() => {
    if (formData.shippingSameAsBilling) {
      setFormData(prev => ({
        ...prev,
        shippingAddress: prev.address,
        shippingCity: prev.city,
        shippingState: prev.state,
        shippingZip: prev.zip,
        shippingCountry: prev.country,
      }));
    }
  }, [formData.address, formData.city, formData.state, formData.zip, formData.country, formData.shippingSameAsBilling]);

  useEffect(() => {
    console.log('[CheckoutForm] useEffect triggered', { isLoaded, hasRecurly: !!recurly });
    
    if (!isLoaded || !recurly) {
      console.log('[CheckoutForm] Recurly not ready yet', { isLoaded, hasRecurly: !!recurly });
      setElementsReady(false);
      return;
    }

    const initializeElements = () => {
      console.log('[CheckoutForm] initializeElements called');
      console.log('[CheckoutForm] Refs status:', {
        cardNumber: !!cardNumberRef.current,
        expirationMonth: !!expirationMonthRef.current,
        expirationYear: !!expirationYearRef.current,
        cvv: !!cvvRef.current,
      });

      if (!recurly || !cardNumberRef.current || !expirationMonthRef.current || !expirationYearRef.current || !cvvRef.current) {
        console.log('[CheckoutForm] Refs not ready, cannot initialize');
        return false;
      }

      try {
        // Only initialize if not already initialized
        if (elementsInstanceRef.current) {
          console.log('[CheckoutForm] Elements already initialized, skipping');
          setElementsReady(true);
          return true;
        }

        console.log('[CheckoutForm] Creating new Elements instance');
        const elements = recurly.Elements();
        console.log('[CheckoutForm] Elements instance created:', !!elements);
        elementsInstanceRef.current = elements; // Store Elements instance for tokenization
        
        console.log('[CheckoutForm] Creating individual Elements');
        const cardNumber = elements.CardNumberElement();
        const cardMonth = elements.CardMonthElement();
        const cardYear = elements.CardYearElement();
        const cardCvv = elements.CardCvvElement();
        console.log('[CheckoutForm] Individual Elements created:', {
          cardNumber: !!cardNumber,
          cardMonth: !!cardMonth,
          cardYear: !!cardYear,
          cardCvv: !!cardCvv,
        });

        console.log('[CheckoutForm] Attaching Elements to DOM refs');
        // Attach Elements to DOM refs
        cardNumber.attach(cardNumberRef.current);
        console.log('[CheckoutForm] CardNumber attached to:', cardNumberRef.current);
        
        cardMonth.attach(expirationMonthRef.current);
        console.log('[CheckoutForm] CardMonth attached to:', expirationMonthRef.current);
        
        cardYear.attach(expirationYearRef.current);
        console.log('[CheckoutForm] CardYear attached to:', expirationYearRef.current);
        
        cardCvv.attach(cvvRef.current);
        console.log('[CheckoutForm] CardCvv attached to:', cvvRef.current);

        // Check if iframes were created and constrain their height
        setTimeout(() => {
          const cardNumberIframe = cardNumberRef.current?.querySelector('iframe');
          const monthIframe = expirationMonthRef.current?.querySelector('iframe');
          const yearIframe = expirationYearRef.current?.querySelector('iframe');
          const cvvIframe = cvvRef.current?.querySelector('iframe');
          console.log('[CheckoutForm] Iframes created:', {
            cardNumber: !!cardNumberIframe,
            month: !!monthIframe,
            year: !!yearIframe,
            cvv: !!cvvIframe,
          });
          
          // Constrain iframe heights to 40px
          [cardNumberIframe, monthIframe, yearIframe, cvvIframe].forEach((iframe) => {
            if (iframe) {
              iframe.style.height = '40px';
              iframe.style.minHeight = '40px';
              iframe.style.maxHeight = '40px';
              iframe.style.width = '100%';
              // Also constrain parent container
              const parent = iframe.parentElement;
              if (parent) {
                parent.style.height = '40px';
                parent.style.minHeight = '40px';
                parent.style.maxHeight = '40px';
                parent.style.overflow = 'hidden';
                parent.style.display = 'flex';
                parent.style.alignItems = 'center';
              }
            }
          });
          
          // Specifically target card number field to prevent height: 100%
          if (cardNumberIframe) {
            // Remove any height: 100% styles
            cardNumberIframe.style.height = '40px';
            cardNumberIframe.style.minHeight = '40px';
            cardNumberIframe.style.maxHeight = '40px';
            
            // Ensure parent containers don't have height: 100%
            let currentParent = cardNumberIframe.parentElement;
            let depth = 0;
            while (currentParent && depth < 5) {
              if (currentParent === cardNumberRef.current) break;
              const computedHeight = window.getComputedStyle(currentParent).height;
              if (computedHeight === '100%' || computedHeight === 'auto') {
                currentParent.style.height = '40px';
                currentParent.style.minHeight = '40px';
                currentParent.style.maxHeight = '40px';
              }
              currentParent = currentParent.parentElement;
              depth++;
            }
            
            // Ensure the ref container itself doesn't have height: 100%
            if (cardNumberRef.current) {
              cardNumberRef.current.style.height = '40px';
              cardNumberRef.current.style.minHeight = '40px';
              cardNumberRef.current.style.maxHeight = '40px';
              cardNumberRef.current.style.display = 'flex';
              cardNumberRef.current.style.alignItems = 'center';
            }
            
            console.log('[CheckoutForm] CardNumber iframe details:', {
              src: cardNumberIframe.src,
              style: cardNumberIframe.style.cssText,
              computedHeight: window.getComputedStyle(cardNumberIframe).height,
              pointerEvents: window.getComputedStyle(cardNumberIframe).pointerEvents,
            });
          }
        }, 500);

        // Mark Elements as ready
        setElementsReady(true);
        console.log('[CheckoutForm] Elements initialization complete, elementsReady set to true');
        return true;
      } catch (error: any) {
        console.error('[CheckoutForm] Error mounting Recurly Elements:', error?.message || error);
        console.error('[CheckoutForm] Error stack:', error?.stack);
        setError(`Failed to initialize payment form: ${error?.message || 'Unknown error'}`);
        setElementsReady(false);
        return false;
      }
    };

    // Try to initialize immediately
    if (initializeElements()) {
      console.log('[CheckoutForm] Elements initialized immediately');
      return;
    }

    // If refs aren't ready, wait a bit and try again
    console.log('[CheckoutForm] Refs not ready, scheduling retry in 100ms');
    const timeout = setTimeout(() => {
      console.log('[CheckoutForm] Retrying initialization after timeout');
      initializeElements();
    }, 100);

    return () => {
      console.log('[CheckoutForm] Cleanup: clearing timeout');
      clearTimeout(timeout);
    };
  }, [recurly, isLoaded]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!recurly || !isLoaded) {
      setError('Recurly is not loaded. Please wait a moment and try again.');
      return;
    }

    if (!planCode || !cartItem) {
      setError('Your cart is empty. Please add a subscription plan to your cart first.');
      return;
    }

    // Validate required billing address fields
    if (!formData.address?.trim() || !formData.city?.trim() || !formData.state?.trim() || !formData.zip?.trim() || !formData.country?.trim()) {
      setError('Please fill in all billing address fields: Street Address, City, State, ZIP Code, and Country.');
      return;
    }

    // Validate shipping address fields
    // If shipping is different from billing, validate shipping fields
    if (!formData.shippingSameAsBilling) {
      if (!formData.shippingAddress?.trim() || !formData.shippingCity?.trim() || !formData.shippingState?.trim() || !formData.shippingZip?.trim() || !formData.shippingCountry?.trim()) {
        setError('Please fill in all shipping address fields: Street Address, City, State, ZIP Code, and Country.');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (!formRef.current) {
        throw new Error('Payment form not ready. Please wait a moment and try again.');
      }

      // Ensure Elements are ready
      if (!elementsReady || !elementsInstanceRef.current) {
        throw new Error('Payment form Elements not initialized. Please wait a moment and try again.');
      }

      const token = await new Promise((resolve, reject) => {
        // Recurly.js v4 Elements API: pass Elements instance to token()
        // Include billing address information in tokenization
        (recurly as any).token(
          elementsInstanceRef.current,
          {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            address1: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            postal_code: formData.zip.trim(),
            country: formData.country.trim(),
          },
          (err: any, token: any) => {
            if (err) {
              console.error('Recurly tokenization error:', err);
              console.error('Error fields:', err.fields);
              console.error('Error details:', err.details);
              reject(err);
            } else {
              console.log('Recurly token created:', token?.id);
              resolve(token);
            }
          }
        );
      });

      // Determine shipping address (use billing if same, otherwise use shipping fields)
      const shippingAddress = formData.shippingSameAsBilling
        ? formData.address.trim()
        : formData.shippingAddress.trim();
      const shippingCity = formData.shippingSameAsBilling
        ? formData.city.trim()
        : formData.shippingCity.trim();
      const shippingState = formData.shippingSameAsBilling
        ? formData.state.trim()
        : formData.shippingState.trim();
      const shippingZip = formData.shippingSameAsBilling
        ? formData.zip.trim()
        : formData.shippingZip.trim();
      const shippingCountry = formData.shippingSameAsBilling
        ? formData.country.trim()
        : formData.shippingCountry.trim();

      // Send token to your backend API
      const requestBody = {
        planCode,
        account: {
          email: formData.email.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
        },
        billingInfo: {
          token: (token as any).id,
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zip: formData.zip.trim(),
          country: formData.country.trim(),
        },
        shippingAddress: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          address: shippingAddress,
          city: shippingCity,
          state: shippingState,
          zip: shippingZip,
          country: shippingCountry,
        },
      };
      
      console.log('Sending subscription request:', { ...requestBody, billingInfo: { token: '***' } });

      const response = await fetch('/api/recurly/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      console.log('Subscription response:', { status: response.status, data });

      if (!response.ok) {
        // Show more detailed error message
        const errorMessage = data.error || data.message || 'Failed to create subscription';
        throw new Error(errorMessage);
      }

      // Clear cart after successful checkout
      clearCart();
      
      // Redirect to success page or subscription management
      router.push(`/subscriptions/success?subscription=${data.subscription.uuid}`);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!isLoaded) {
    const publicKey = process.env.NEXT_PUBLIC_RECURLY_PUBLIC_KEY;
    const hasRecurlyScript = typeof window !== 'undefined' && !!(window as any).Recurly;
    
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400 mb-4">Loading payment form...</div>
        {!publicKey && (
          <div className="text-sm text-yellow-600">Warning: NEXT_PUBLIC_RECURLY_PUBLIC_KEY not set</div>
        )}
        {publicKey && !hasRecurlyScript && (
          <div className="text-sm text-yellow-600">Loading Recurly.js script...</div>
        )}
      </div>
    );
  }

  if (isLoaded && !recurly) {
    // Check if public key is configured (available at build time in client components)
    const publicKey = process.env.NEXT_PUBLIC_RECURLY_PUBLIC_KEY;
    
    if (!publicKey) {
      return (
        <div className="rounded-lg bg-yellow-50 p-6 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          <h3 className="mb-2 font-semibold">Recurly Not Configured</h3>
          <p className="mb-4">
            Please add <code className="rounded bg-yellow-100 px-2 py-1 dark:bg-yellow-900/40">NEXT_PUBLIC_RECURLY_PUBLIC_KEY</code> to your <code className="rounded bg-yellow-100 px-2 py-1 dark:bg-yellow-900/40">.env.local</code> file to enable checkout.
          </p>
          <p className="mb-4 text-sm">
            <strong>Important:</strong> After adding the key, you must restart your dev server with <code className="rounded bg-yellow-100 px-2 py-1 dark:bg-yellow-900/40">npm run dev</code> for the change to take effect.
          </p>
          <Link
            href="/subscriptions"
            className="inline-block rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
          >
            Back to Plans
          </Link>
        </div>
      );
    }
    // If key exists but recurly is null, script might still be loading
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">  </div>
      </div>
    );
  }

  // Show error if cart is empty
  if (!cartItem) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-yellow-800">
        <h3 className="mb-2 font-semibold">Cart is Empty</h3>
        <p className="mb-4">Please add a subscription plan to your cart before checking out.</p>
        <Link
          href="/subscriptions"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Browse Subscriptions
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
      <div>
        <h2 className="mb-2 text-2xl text-gray-900 dark:text-gray-100 font-sailers">
          Complete Your Subscription
        </h2>
        <p className="text-sm text-white mb-4">
          Subscribing to: <span className="font-semibold text-white">{cartItem.planTitle}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 focus:border-black focus:outline-none focus:ring-1 focus:black dark:border-black dark:bg-mint dark:text-black"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <input
          type="email"
          id="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="form-input"
        />
      </div>

      {/* Address Information */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Billing Address
        </h3>
        
        <div className="mb-4">
          <label htmlFor="address" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Street Address
          </label>
          <input
            type="text"
            id="address"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="form-input"
            placeholder="4009 Marathon Blvd"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              City
            </label>
            <input
              type="text"
              id="city"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="form-input"
              placeholder="City"
            />
          </div>

          <div>
            <label htmlFor="state" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              State
            </label>
            <input
              type="text"
              id="state"
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="form-input"
              placeholder="State"
              maxLength={2}
            />
          </div>

          <div>
            <label htmlFor="zip" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              ZIP Code
            </label>
            <input
              type="text"
              id="zip"
              required
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              className="form-input"
              placeholder="12345"
              pattern="[0-9]{5}(-[0-9]{4})?"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="country" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Country
          </label>
          <select
            id="country"
            required
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="form-input"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="IT">Italy</option>
            <option value="ES">Spain</option>
            <option value="NL">Netherlands</option>
            <option value="BE">Belgium</option>
            <option value="CH">Switzerland</option>
            <option value="AT">Austria</option>
            <option value="SE">Sweden</option>
            <option value="NO">Norway</option>
            <option value="DK">Denmark</option>
            <option value="FI">Finland</option>
            <option value="IE">Ireland</option>
            <option value="NZ">New Zealand</option>
            <option value="MX">Mexico</option>
            <option value="BR">Brazil</option>
            <option value="AR">Argentina</option>
            <option value="CL">Chile</option>
            <option value="CO">Colombia</option>
            <option value="PE">Peru</option>
            <option value="JP">Japan</option>
            <option value="KR">South Korea</option>
            <option value="CN">China</option>
            <option value="IN">India</option>
            <option value="SG">Singapore</option>
            <option value="HK">Hong Kong</option>
            <option value="TW">Taiwan</option>
            <option value="TH">Thailand</option>
            <option value="MY">Malaysia</option>
            <option value="ID">Indonesia</option>
            <option value="PH">Philippines</option>
            <option value="VN">Vietnam</option>
            <option value="ZA">South Africa</option>
            <option value="EG">Egypt</option>
            <option value="IL">Israel</option>
            <option value="AE">United Arab Emirates</option>
            <option value="SA">Saudi Arabia</option>
            <option value="TR">Turkey</option>
            <option value="RU">Russia</option>
            <option value="PL">Poland</option>
            <option value="CZ">Czech Republic</option>
            <option value="PT">Portugal</option>
            <option value="GR">Greece</option>
            <option value="RO">Romania</option>
            <option value="HU">Hungary</option>
            <option value="BG">Bulgaria</option>
            <option value="HR">Croatia</option>
            <option value="SK">Slovakia</option>
            <option value="SI">Slovenia</option>
            <option value="EE">Estonia</option>
            <option value="LV">Latvia</option>
            <option value="LT">Lithuania</option>
            <option value="LU">Luxembourg</option>
            <option value="IS">Iceland</option>
            <option value="MT">Malta</option>
            <option value="CY">Cyprus</option>
          </select>
        </div>
      </div>

      {/* Shipping Address Information */}
      <div className="border-t border-gray-200 pt-6">
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.shippingSameAsBilling}
              onChange={(e) => {
                const isSame = e.target.checked;
                setFormData({
                  ...formData,
                  shippingSameAsBilling: isSame,
                  // When checked, copy billing to shipping
                  shippingAddress: isSame ? formData.address : formData.shippingAddress,
                  shippingCity: isSame ? formData.city : formData.shippingCity,
                  shippingState: isSame ? formData.state : formData.shippingState,
                  shippingZip: isSame ? formData.zip : formData.shippingZip,
                  shippingCountry: isSame ? formData.country : formData.shippingCountry,
                });
              }}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Shipping address is the same as billing address
            </span>
          </label>
        </div>

        {!formData.shippingSameAsBilling && (
          <>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Shipping Address
            </h3>
            
            <div className="mb-4">
              <label htmlFor="shippingAddress" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Street Address
              </label>
              <input
                type="text"
                id="shippingAddress"
                required={!formData.shippingSameAsBilling}
                value={formData.shippingAddress}
                onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                className="form-input"
                placeholder="4009 Marathon Blvd"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="shippingCity" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  City
                </label>
                <input
                  type="text"
                  id="shippingCity"
                  required={!formData.shippingSameAsBilling}
                  value={formData.shippingCity}
                  onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                  className="form-input"
                  placeholder="City"
                />
              </div>

              <div>
                <label htmlFor="shippingState" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  State
                </label>
                <input
                  type="text"
                  id="shippingState"
                  required={!formData.shippingSameAsBilling}
                  value={formData.shippingState}
                  onChange={(e) => setFormData({ ...formData, shippingState: e.target.value })}
                  className="form-input"
                  placeholder="State"
                  maxLength={2}
                />
              </div>

              <div>
                <label htmlFor="shippingZip" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="shippingZip"
                  required={!formData.shippingSameAsBilling}
                  value={formData.shippingZip}
                  onChange={(e) => setFormData({ ...formData, shippingZip: e.target.value })}
                  className="form-input"
                  placeholder="12345"
                  pattern="[0-9]{5}(-[0-9]{4})?"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="shippingCountry" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Country
              </label>
              <select
                id="shippingCountry"
                required={!formData.shippingSameAsBilling}
                value={formData.shippingCountry}
                onChange={(e) => setFormData({ ...formData, shippingCountry: e.target.value })}
                className="form-input"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="IT">Italy</option>
                <option value="ES">Spain</option>
                <option value="NL">Netherlands</option>
                <option value="BE">Belgium</option>
                <option value="CH">Switzerland</option>
                <option value="AT">Austria</option>
                <option value="SE">Sweden</option>
                <option value="NO">Norway</option>
                <option value="DK">Denmark</option>
                <option value="FI">Finland</option>
                <option value="IE">Ireland</option>
                <option value="NZ">New Zealand</option>
                <option value="MX">Mexico</option>
                <option value="BR">Brazil</option>
                <option value="AR">Argentina</option>
                <option value="CL">Chile</option>
                <option value="CO">Colombia</option>
                <option value="PE">Peru</option>
                <option value="JP">Japan</option>
                <option value="KR">South Korea</option>
                <option value="CN">China</option>
                <option value="IN">India</option>
                <option value="SG">Singapore</option>
                <option value="HK">Hong Kong</option>
                <option value="TW">Taiwan</option>
                <option value="TH">Thailand</option>
                <option value="MY">Malaysia</option>
                <option value="ID">Indonesia</option>
                <option value="PH">Philippines</option>
                <option value="VN">Vietnam</option>
                <option value="ZA">South Africa</option>
                <option value="EG">Egypt</option>
                <option value="IL">Israel</option>
                <option value="AE">United Arab Emirates</option>
                <option value="SA">Saudi Arabia</option>
                <option value="TR">Turkey</option>
                <option value="RU">Russia</option>
                <option value="PL">Poland</option>
                <option value="CZ">Czech Republic</option>
                <option value="PT">Portugal</option>
                <option value="GR">Greece</option>
                <option value="RO">Romania</option>
                <option value="HU">Hungary</option>
                <option value="BG">Bulgaria</option>
                <option value="HR">Croatia</option>
                <option value="SK">Slovakia</option>
                <option value="SI">Slovenia</option>
                <option value="EE">Estonia</option>
                <option value="LV">Latvia</option>
                <option value="LT">Lithuania</option>
                <option value="LU">Luxembourg</option>
                <option value="IS">Iceland</option>
                <option value="MT">Malta</option>
                <option value="CY">Cyprus</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Recurly.js payment form will be mounted here */}
      <div id="recurly-elements" className="space-y-4">
        <div className="w-full">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Card Number
          </label>
          <div
            ref={cardNumberRef}
            className="form-input"
            style={{ height: '40px', minHeight: '40px', maxHeight: '40px', overflow: 'hidden' }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="w-full">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Month
            </label>
            <div
              ref={expirationMonthRef}
              className="form-input"
              style={{ height: '40px', minHeight: '40px', maxHeight: '40px', overflow: 'hidden' }}
            />
          </div>

          <div className="w-full">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Year
            </label>
            <div
              ref={expirationYearRef}
              className="form-input"
              style={{ height: '40px', minHeight: '40px', maxHeight: '40px', overflow: 'hidden' }}
            />
          </div>

          <div className="w-full">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              CVV
            </label>
            <div
              ref={cvvRef}
              className="form-input"
              style={{ height: '40px', minHeight: '40px', maxHeight: '40px', overflow: 'hidden' }}
            />
          </div>
        </div>
      </div>

          <button
            type="submit"
            disabled={isProcessing || !elementsReady}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isProcessing ? 'Processing...' : !elementsReady ? 'Initializing payment form...' : 'Complete Subscription'}
          </button>
    </form>
  );
}

'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface CartItem {
  id: string; // Unique ID for cart item
  planCode: string;
  planTitle: string;
  price: {
    amount: number;
    currency: string;
  };
  interval: {
    length: number;
    unit: string;
    totalBillingCycles: number;
  };
  slug: string; // For linking back to subscription page
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
      // Check if item already exists (same planCode)
      const existingIndex = prevItems.findIndex((i) => i.planCode === item.planCode);
      
      if (existingIndex >= 0) {
        // Replace existing item (user might have changed the plan option)
        const newItems = [...prevItems];
        newItems[existingIndex] = item;
        return newItems;
      }
      
      // Add new item
      return [...prevItems, item];
    });
  };

  const removeItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price.amount, 0);
  };

  const getItemCount = () => {
    return items.length;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        getTotalPrice,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

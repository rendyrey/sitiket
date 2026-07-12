'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem } from '../types';

type CartInput = Omit<CartItem, 'quantity'> & { quantity?: number };

interface CartContextValue {
  items: CartItem[];
  addItemToCart: (item: CartInput, quantity: number) => void;
  removeItemFromCart: (id: CartItem['id']) => void;
  clearItemFromCart: (id: CartItem['id']) => void;
  getItemFromCart: (id: CartItem['id']) => CartItem | undefined;
  isInCart: (id: CartItem['id']) => boolean;
  resetCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItemToCart = useCallback((item: CartInput, quantity: number) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (!existing) {
        return [...current, { ...item, quantity } as CartItem];
      }
      return current.map((entry) =>
        entry.id === item.id
          ? { ...entry, quantity: entry.quantity + quantity }
          : entry
      );
    });
  }, []);

  const removeItemFromCart = useCallback((id: CartItem['id']) => {
    setItems((current) =>
      current
        .map((entry) =>
          entry.id === id
            ? { ...entry, quantity: entry.quantity - 1 }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  }, []);

  const clearItemFromCart = useCallback((id: CartItem['id']) => {
    setItems((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const getItemFromCart = useCallback(
    (id: CartItem['id']) => items.find((entry) => entry.id === id),
    [items]
  );
  const isInCart = useCallback(
    (id: CartItem['id']) => items.some((entry) => entry.id === id),
    [items]
  );
  const resetCart = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      addItemToCart,
      removeItemFromCart,
      clearItemFromCart,
      getItemFromCart,
      isInCart,
      resetCart,
    }),
    [
      items,
      addItemToCart,
      removeItemFromCart,
      clearItemFromCart,
      getItemFromCart,
      isInCart,
      resetCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

import { useCallback, useEffect, useState } from "react";

export type CartLine = {
  itemId: string;
  name: string;
  price_kes: number;
  image_url: string | null;
  variantSelections: Record<string, string>;
  quantity: number;
};

const STORAGE_KEY = "sb-merch-cart";
const UPDATED_EVENT = "sb-cart-updated";

function lineKey(itemId: string, variants: Record<string, string>) {
  const sorted = Object.entries(variants)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  return `${itemId}::${sorted}`;
}

function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function writeCart(lines: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private browsing / storage disabled -- the cart just won't persist.
  }
  window.dispatchEvent(new Event(UPDATED_EVENT));
}

/** A guest-friendly shopping cart kept in localStorage until checkout, when
 *  it's committed to a real order (header + line items) in the database. */
export function useCart() {
  const [lines, setLines] = useState<CartLine[]>(() => readCart());

  useEffect(() => {
    const sync = () => setLines(readCart());
    window.addEventListener(UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addItem = useCallback((line: Omit<CartLine, "quantity"> & { quantity?: number }) => {
    const key = lineKey(line.itemId, line.variantSelections);
    const current = readCart();
    const existing = current.find((l) => lineKey(l.itemId, l.variantSelections) === key);
    const next = existing
      ? current.map((l) =>
          lineKey(l.itemId, l.variantSelections) === key
            ? { ...l, quantity: l.quantity + (line.quantity ?? 1) }
            : l,
        )
      : [...current, { ...line, quantity: line.quantity ?? 1 }];
    writeCart(next);
  }, []);

  const updateQuantity = useCallback(
    (itemId: string, variantSelections: Record<string, string>, quantity: number) => {
      const key = lineKey(itemId, variantSelections);
      const current = readCart();
      const next =
        quantity <= 0
          ? current.filter((l) => lineKey(l.itemId, l.variantSelections) !== key)
          : current.map((l) =>
              lineKey(l.itemId, l.variantSelections) === key ? { ...l, quantity } : l,
            );
      writeCart(next);
    },
    [],
  );

  const removeItem = useCallback(
    (itemId: string, variantSelections: Record<string, string>) => {
      updateQuantity(itemId, variantSelections, 0);
    },
    [updateQuantity],
  );

  const clear = useCallback(() => writeCart([]), []);

  const totalItems = lines.reduce((s, l) => s + l.quantity, 0);
  const totalKes = lines.reduce((s, l) => s + l.quantity * l.price_kes, 0);

  return { lines, addItem, updateQuantity, removeItem, clear, totalItems, totalKes };
}

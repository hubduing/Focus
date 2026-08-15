export const MAX_CART_QTY = 99

export interface CartLineInput {
  productId: string
  quantity: number
  price: number
  discountPrice: number | null
  stock: number
  active: boolean
}

export interface CartLine {
  productId: string
  quantity: number
  basePrice: number
  unitPrice: number
  subtotal: number
  baseSubtotal: number
  stock: number
  active: boolean
  available: boolean
}

export interface CartTotals {
  distinctCount: number
  count: number
  subtotal: number
  baseSubtotal: number
  discount: number
  unavailableCount: number
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function calculateCartLines(lines: CartLineInput[]): CartLine[] {
  return lines.map((line) => {
    const unitPrice = line.active && line.discountPrice !== null ? line.discountPrice : line.price
    const available = line.active && line.stock > 0 && line.quantity <= line.stock
    return {
      productId: line.productId,
      quantity: line.quantity,
      basePrice: line.price,
      unitPrice,
      baseSubtotal: round2(line.price * line.quantity),
      subtotal: round2(unitPrice * line.quantity),
      stock: line.stock,
      active: line.active,
      available,
    }
  })
}

function totalsFromLines(lines: CartLine[]): CartTotals {
  return {
    distinctCount: lines.length,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    baseSubtotal: round2(lines.reduce((sum, line) => sum + line.baseSubtotal, 0)),
    subtotal: round2(lines.reduce((sum, line) => sum + line.subtotal, 0)),
    discount: round2(lines.reduce((sum, line) => sum + (line.baseSubtotal - line.subtotal), 0)),
    unavailableCount: lines.filter((line) => !line.available).length,
  }
}

export function calculateCartTotals(lines: CartLineInput[]): CartTotals {
  return totalsFromLines(calculateCartLines(lines))
}

export interface CartComputation {
  lines: CartLine[]
  totals: CartTotals
}

export function computeCart(lines: CartLineInput[]): CartComputation {
  const calc = calculateCartLines(lines)
  return { lines: calc, totals: totalsFromLines(calc) }
}
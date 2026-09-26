/** GTIN check digit (EAN-8, UPC-A, EAN-13): weights 3/1 from the right, excluding the check digit. */
export function gtinCheckDigit(body: string): number {
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i])
    sum += digit * (i % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10
}

export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false
  return gtinCheckDigit(code.slice(0, -1)) === Number(code[code.length - 1])
}

/** Expands an 8-digit UPC-E code to its 12-digit UPC-A form. */
export function upcEtoA(upce: string): string | null {
  if (!/^[01]\d{7}$/.test(upce)) return null
  const ns = upce[0]!
  const d = upce.slice(1, 7)
  const check = upce[7]!
  const [d1, d2, d3, d4, d5, d6] = d.split('') as [string, string, string, string, string, string]
  let body: string
  if (d6 === '0' || d6 === '1' || d6 === '2') body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`
  else if (d6 === '3') body = `${d1}${d2}${d3}00000${d4}${d5}`
  else if (d6 === '4') body = `${d1}${d2}${d3}${d4}00000${d5}`
  else body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`
  return `${ns}${body}${check}`
}

export type BarcodeFormatHint = 'ean_13' | 'ean_8' | 'upc_a' | 'upc_e' | string

/**
 * Cleans a scanned or typed code into the form Open Food Facts stores (EAN-13 for UPC-A/E, EAN-8 as is).
 * Returns null if it isn't a valid product barcode (bad length or check digit), which filters misreads.
 */
export function normalizeBarcode(raw: string, format?: BarcodeFormatHint): string | null {
  const digits = raw.replace(/\D/g, '')
  if (format === 'upc_e' || (digits.length === 8 && format === undefined && !isValidGtin(digits))) {
    const upca = upcEtoA(digits)
    if (upca && isValidGtin(upca)) return `0${upca}`
    if (format === 'upc_e') return null
  }
  if (digits.length === 12) return isValidGtin(digits) ? `0${digits}` : null
  if (digits.length === 8 || digits.length === 13) return isValidGtin(digits) ? digits : null
  if (digits.length === 14 && isValidGtin(digits)) return digits.startsWith('0') ? digits.slice(1) : digits
  return null
}

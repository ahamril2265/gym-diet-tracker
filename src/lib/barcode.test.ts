import { describe, expect, it } from 'vitest'
import { gtinCheckDigit, isValidGtin, normalizeBarcode, upcEtoA } from './barcode'

describe('barcodes', () => {
  it('computes and validates GTIN check digits', () => {
    expect(gtinCheckDigit('301762401070')).toBe(1) // Nutella 3017624010701
    expect(isValidGtin('3017624010701')).toBe(true)
    expect(isValidGtin('8901058851298')).toBe(true) // Maggi (India)
    expect(isValidGtin('3017624010702')).toBe(false)
    expect(isValidGtin('96385074')).toBe(true) // EAN-8 example
    expect(isValidGtin('abc')).toBe(false)
  })

  it('expands UPC-E to UPC-A', () => {
    expect(upcEtoA('04252614')).toBe('042100005264')
    expect(upcEtoA('01234565')).toBe('012345000065')
    expect(upcEtoA('1234')).toBeNull()
  })

  it('normalizes to what Open Food Facts stores', () => {
    expect(normalizeBarcode('3017624010701')).toBe('3017624010701')
    expect(normalizeBarcode(' 8901058 851298 ')).toBe('8901058851298')
    expect(normalizeBarcode('042100005264')).toBe('0042100005264') // UPC-A → EAN-13
    expect(normalizeBarcode('04252614', 'upc_e')).toBe('0042100005264')
    expect(normalizeBarcode('96385074', 'ean_8')).toBe('96385074')
    expect(normalizeBarcode('96385074')).toBe('96385074') // valid EAN-8 stays EAN-8
    expect(normalizeBarcode('04252614')).toBe('0042100005264') // not a valid EAN-8 → try UPC-E
  })

  it('rejects misreads and junk', () => {
    expect(normalizeBarcode('3017624010702')).toBeNull()
    expect(normalizeBarcode('12345')).toBeNull()
    expect(normalizeBarcode('')).toBeNull()
  })
})

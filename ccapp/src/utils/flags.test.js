import { flagForCountryName } from './flags'

describe('flagForCountryName', () => {
  test('returns flag emoji for exact matches', () => {
    expect(flagForCountryName('US')).toBe('🇺🇸')
    expect(flagForCountryName('USA')).toBe('🇺🇸')
    expect(flagForCountryName('United States')).toBe('🇺🇸')
    expect(flagForCountryName('UK')).toBe('🇬🇧')
    expect(flagForCountryName('United Kingdom')).toBe('🇬🇧')
    expect(flagForCountryName('Canada')).toBe('🇨🇦')
  })

  test('is case-insensitive and trims whitespace', () => {
    expect(flagForCountryName(' united states ')).toBe('🇺🇸')
    expect(flagForCountryName('uNiTeD kInGdOm')).toBe('🇬🇧')
  })

  test('returns null for unknown or empty', () => {
    expect(flagForCountryName('')).toBeNull()
    expect(flagForCountryName('Atlantis')).toBeNull()
    expect(flagForCountryName(null)).toBeNull()
    expect(flagForCountryName(undefined)).toBeNull()
  })
})

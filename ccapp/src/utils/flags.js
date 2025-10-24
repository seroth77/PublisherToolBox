// Small utility to map country names to flag emoji.
// For production you'd want a more comprehensive mapping or use an external lib.

const countryToCode = {
  'United States': 'US',
  'United State': 'US',
  'USA': 'US',
  'US': 'US',
  'United Kingdom': 'GB',
  'UK': 'GB',
  'Canada': 'CA',
  'Australia': 'AU',
  'Germany': 'DE',
  'France': 'FR',
  'Spain': 'ES',
  'Italy': 'IT',
  'Netherlands': 'NL',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Korea': 'KR',
  'China': 'CN',
  'India': 'IN',
  'Brazil': 'BR',
  'Mexico': 'MX',
  'United Kingdom-England': 'GB',
  'Scotland': 'GB',
};

function codeToEmoji(code) {
  if (!code || code.length !== 2) return null;
  // Regional Indicator Symbol Letter A starts at 0x1F1E6
  const A = 0x1f1e6 - 65; // 'A' charCode 65
  // For each letter, add its char code to A to get the regional indicator symbol
  const chars = Array.from(code.toUpperCase()).map(c => String.fromCodePoint(A + c.charCodeAt(0)));
  return chars.join('');
}

export function flagForCountryName(name) {
  if (!name) return null;
  const trimmed = name.trim();
  // direct exact match
  let code = countryToCode[trimmed];
  if (!code) {
    // try capitalized words match
    const normalized = trimmed.replace(/\s+/g, ' ').toLowerCase();
    for (const key of Object.keys(countryToCode)) {
      if (key.toLowerCase() === normalized) {
        code = countryToCode[key];
        break;
      }
    }
  }
  if (!code) return null;
  return codeToEmoji(code);
}

export default flagForCountryName;

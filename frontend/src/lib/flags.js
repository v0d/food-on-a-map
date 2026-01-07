// Country to flag emoji mapping
const countryFlags = {
  'Japan': '🇯🇵',
  'Japanese': '🇯🇵',
  'Thailand': '🇹🇭',
  'Thai': '🇹🇭',
  'Vietnam': '🇻🇳',
  'Vietnamese': '🇻🇳',
  'China': '🇨🇳',
  'Chinese': '🇨🇳',
  'Korea': '🇰🇷',
  'Korean': '🇰🇷',
  'South Korea': '🇰🇷',
  'India': '🇮🇳',
  'Indian': '🇮🇳',
  'Indonesia': '🇮🇩',
  'Indonesian': '🇮🇩',
  'Malaysia': '🇲🇾',
  'Malaysian': '🇲🇾',
  'Philippines': '🇵🇭',
  'Filipino': '🇵🇭',
  'Singapore': '🇸🇬',
  'Singaporean': '🇸🇬',
  'Taiwan': '🇹🇼',
  'Taiwanese': '🇹🇼',
  'Hong Kong': '🇭🇰',
  'Nepal': '🇳🇵',
  'Nepalese': '🇳🇵',
  'Myanmar': '🇲🇲',
  'Burmese': '🇲🇲',
  'Cambodia': '🇰🇭',
  'Cambodian': '🇰🇭',
  'Laos': '🇱🇦',
  'Laotian': '🇱🇦',
  'Sri Lanka': '🇱🇰',
  'Sri Lankan': '🇱🇰',
  'Pakistan': '🇵🇰',
  'Pakistani': '🇵🇰',
  'Bangladesh': '🇧🇩',
  'Bangladeshi': '🇧🇩',
  'Mongolia': '🇲🇳',
  'Mongolian': '🇲🇳',
}

export function getFlag(countryOrCuisine) {
  if (!countryOrCuisine) return '🍜'
  return countryFlags[countryOrCuisine] || '🍜'
}

export function getFlagForRestaurant(restaurant) {
  // Try origin first, then cuisine
  return getFlag(restaurant.origin) || getFlag(restaurant.cuisine) || '🍜'
}

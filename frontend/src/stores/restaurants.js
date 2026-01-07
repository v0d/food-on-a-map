import { writable, derived } from 'svelte/store'

// Core state
export const restaurants = writable([])
export const categories = writable({ cuisines: [], origins: [] })
export const selectedRestaurant = writable(null)
export const editingRestaurant = writable(null)
export const searchQuery = writable('')
export const selectedCuisine = writable('')
export const selectedOrigin = writable('')
export const sortBy = writable('name-asc')

// Sort options
export const sortOptions = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'rating-desc', label: 'Rating (Best)' },
  { value: 'rating-asc', label: 'Rating (Lowest)' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' }
]

// Sort function
function sortRestaurants(restaurants, sortKey) {
  const sorted = [...restaurants]
  switch (sortKey) {
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name))
    case 'rating-desc':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    case 'rating-asc':
      return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0))
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    default:
      return sorted
  }
}

// Derived filtered restaurants
export const filteredRestaurants = derived(
  [restaurants, searchQuery, selectedCuisine, selectedOrigin, sortBy],
  ([$restaurants, $searchQuery, $selectedCuisine, $selectedOrigin, $sortBy]) => {
    let filtered = $restaurants

    // Text search
    if ($searchQuery) {
      const query = $searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query))
      )
    }

    // Cuisine filter
    if ($selectedCuisine) {
      filtered = filtered.filter(r => r.cuisine === $selectedCuisine)
    }

    // Origin filter
    if ($selectedOrigin) {
      filtered = filtered.filter(r => r.origin === $selectedOrigin)
    }

    // Sort
    filtered = sortRestaurants(filtered, $sortBy)

    return filtered
  }
)

// Actions
export async function fetchRestaurants(includeHidden = false) {
  try {
    const url = includeHidden ? '/api/restaurants?includeHidden=1' : '/api/restaurants'
    const headers = includeHidden ? getAuthHeadersForFetch() : {}
    const res = await fetch(url, { headers })
    const data = await res.json()
    restaurants.set(data)
  } catch (err) {
    console.error('Failed to fetch restaurants:', err)
  }
}

function getAuthHeadersForFetch() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_token') : null
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export async function fetchCategories() {
  try {
    const res = await fetch('/api/categories')
    const data = await res.json()
    categories.set(data)
  } catch (err) {
    console.error('Failed to fetch categories:', err)
  }
}

export function selectRestaurant(restaurant) {
  selectedRestaurant.set(restaurant)
}

export function clearSelection() {
  selectedRestaurant.set(null)
}

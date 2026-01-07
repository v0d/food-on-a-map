import { writable } from 'svelte/store'

const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_token') : null

export const authToken = writable(storedToken)
export const isAuthenticated = writable(false)

// Check token validity on load
if (storedToken) {
  checkAuth()
}

export async function checkAuth() {
  const token = localStorage.getItem('admin_token')
  if (!token) {
    isAuthenticated.set(false)
    return false
  }

  try {
    const res = await fetch('/api/auth/check', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    isAuthenticated.set(data.authenticated)
    if (!data.authenticated) {
      localStorage.removeItem('admin_token')
      authToken.set(null)
    }
    return data.authenticated
  } catch {
    isAuthenticated.set(false)
    return false
  }
}

export async function login(password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })

  if (!res.ok) {
    throw new Error('Invalid password')
  }

  const { token } = await res.json()
  localStorage.setItem('admin_token', token)
  authToken.set(token)
  isAuthenticated.set(true)
  return token
}

export async function logout() {
  const token = localStorage.getItem('admin_token')
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
  }
  localStorage.removeItem('admin_token')
  authToken.set(null)
  isAuthenticated.set(false)
}

export function getAuthHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

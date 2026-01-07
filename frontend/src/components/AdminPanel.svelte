<script>
  import { onMount } from 'svelte'
  import { restaurants, fetchRestaurants, fetchCategories, editingRestaurant } from '../stores/restaurants.js'
  import { isAuthenticated, login, logout, checkAuth, getAuthHeaders } from '../stores/auth.js'
  import BowlRating from './BowlRating.svelte'
  import { getFlag } from '../lib/flags.js'

  export let onClose

  let currentlyEditing = null
  let isCreating = false
  let saving = false
  let error = ''
  let loginError = ''
  let password = ''
  let loggingIn = false
  let uploadingImage = false
  let gmapsUrl = ''
  let extracting = false
  let extractionSuccess = ''

  // Form state
  let form = {
    name: '',
    description: '',
    address: '',
    lat: '',
    lng: '',
    cuisine: '',
    origin: '',
    rating: 3,
    images: [],
    is_new: false,
    is_hot: false
  }

  onMount(async () => {
    await checkAuth()
    // Fetch all restaurants including hidden ones for admin
    if ($isAuthenticated) {
      await fetchRestaurants(true)
    }
    // Check if we're opening to edit a specific restaurant
    if ($editingRestaurant) {
      startEdit($editingRestaurant)
    }
  })

  async function handleToggleHidden(restaurant) {
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ hidden: !restaurant.hidden })
      })

      if (!res.ok) throw new Error('Failed to update')

      await fetchRestaurants(true)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    loggingIn = true
    loginError = ''
    try {
      await login(password)
      password = ''
    } catch (err) {
      loginError = err.message
    } finally {
      loggingIn = false
    }
  }

  async function handleLogout() {
    await logout()
  }

  function resetForm() {
    form = {
      name: '',
      description: '',
      address: '',
      lat: '',
      lng: '',
      cuisine: '',
      origin: '',
      rating: 3,
      images: [],
      is_new: false,
      is_hot: false
    }
    error = ''
    gmapsUrl = ''
    extractionSuccess = ''
  }

  async function extractFromGoogleMaps() {
    if (!gmapsUrl || !gmapsUrl.includes('google.com/maps')) {
      error = 'Please enter a valid Google Maps URL'
      return
    }

    extracting = true
    error = ''
    extractionSuccess = ''

    try {
      const res = await fetch('/api/extract-gmaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ url: gmapsUrl })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Extraction failed')
      }

      const data = await res.json()

      // Auto-fill form with extracted data
      if (data.name && !form.name) form.name = data.name
      if (data.address && !form.address) form.address = data.address
      if (data.lat) form.lat = data.lat.toString()
      if (data.lng) form.lng = data.lng.toString()
      if (data.cuisine && !form.cuisine) form.cuisine = data.cuisine
      if (data.origin && !form.origin) form.origin = data.origin
      if (data.imageUrl && !form.images.includes(data.imageUrl)) {
        form.images = [...form.images, data.imageUrl]
      }

      // Show success message
      const parts = []
      if (data.extracted.hasCoordinates) parts.push('location')
      if (data.extracted.hasAddress) parts.push('address')
      if (data.extracted.hasImage) parts.push('image')

      extractionSuccess = parts.length > 0
        ? `Extracted: ${parts.join(', ')}`
        : 'URL processed (limited data found)'

    } catch (err) {
      error = err.message
    } finally {
      extracting = false
    }
  }

  function startCreate() {
    resetForm()
    currentlyEditing = null
    isCreating = true
  }

  function startEdit(restaurant) {
    currentlyEditing = restaurant
    isCreating = false
    form = {
      name: restaurant.name,
      description: restaurant.description || '',
      address: restaurant.address,
      lat: restaurant.lat.toString(),
      lng: restaurant.lng.toString(),
      cuisine: restaurant.cuisine || '',
      origin: restaurant.origin || '',
      rating: restaurant.rating || 3,
      images: [...(restaurant.images || [])],
      is_new: restaurant.is_new || false,
      is_hot: restaurant.is_hot || false
    }
    error = ''
  }

  function cancelEdit() {
    currentlyEditing = null
    isCreating = false
    resetForm()
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    uploadingImage = true
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const { url } = await res.json()
      form.images = [...form.images, url]
    } catch (err) {
      error = err.message
    } finally {
      uploadingImage = false
      e.target.value = ''
    }
  }

  function removeImage(index) {
    form.images = form.images.filter((_, i) => i !== index)
  }

  async function handleSubmit() {
    if (!form.name || !form.address || !form.lat || !form.lng) {
      error = 'Name, address, and coordinates are required'
      return
    }

    saving = true
    error = ''

    const payload = {
      name: form.name,
      description: form.description || null,
      address: form.address,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      cuisine: form.cuisine || null,
      origin: form.origin || null,
      rating: form.rating,
      images: form.images,
      is_new: form.is_new,
      is_hot: form.is_hot
    }

    try {
      const url = currentlyEditing
        ? `/api/restaurants/${currentlyEditing.id}`
        : '/api/restaurants'

      const res = await fetch(url, {
        method: currentlyEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      await fetchRestaurants(true)
      await fetchCategories()
      cancelEdit()
    } catch (err) {
      error = err.message
    } finally {
      saving = false
    }
  }

  async function handleDelete(restaurant) {
    if (!confirm(`Delete "${restaurant.name}"?`)) return

    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      await fetchRestaurants(true)
      await fetchCategories()
    } catch (err) {
      alert(err.message)
    }
  }

  async function lookupAddress() {
    if (!form.address) return

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}`
      )
      const data = await res.json()

      if (data.length > 0) {
        form.lat = data[0].lat
        form.lng = data[0].lon
      } else {
        error = 'Address not found'
      }
    } catch (err) {
      error = 'Geocoding failed'
    }
  }
</script>

<div class="admin-overlay">
  <div class="admin-panel">
    <header class="admin-header">
      <div class="header-left">
        <h2>Admin Panel</h2>
        {#if $isAuthenticated}
          <span class="auth-badge">Authenticated</span>
        {/if}
      </div>
      <div class="header-actions">
        {#if $isAuthenticated}
          <button class="btn-ghost" on:click={handleLogout}>Logout</button>
        {/if}
        <button class="close-btn" on:click={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="admin-content">
      {#if !$isAuthenticated}
        <!-- Login Form -->
        <div class="login-container">
          <div class="login-icon">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v3H9V7c0-1.654 1.346-3 3-3zm0 10a2 2 0 110 4 2 2 0 010-4z" fill="currentColor"/>
            </svg>
          </div>
          <h3>Admin Access Required</h3>
          <p>Enter your password to manage restaurants</p>

          <form on:submit={handleLogin} class="login-form">
            {#if loginError}
              <div class="error">{loginError}</div>
            {/if}
            <input
              type="password"
              bind:value={password}
              placeholder="Password"
              required
              autocomplete="current-password"
            />
            <button type="submit" class="btn-primary" disabled={loggingIn}>
              {loggingIn ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      {:else if isCreating || currentlyEditing}
        <!-- Restaurant Form -->
        <form class="restaurant-form" on:submit|preventDefault={handleSubmit}>
          <div class="form-header">
            <h3>{currentlyEditing ? 'Edit Restaurant' : 'Add New Restaurant'}</h3>
            <button type="button" class="btn-ghost" on:click={cancelEdit}>Cancel</button>
          </div>

          <!-- Google Maps URL extraction -->
          <div class="gmaps-extract">
            <label for="gmaps-url">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
              </svg>
              Paste Google Maps link to auto-fill
            </label>
            <div class="gmaps-input-row">
              <input
                id="gmaps-url"
                type="text"
                bind:value={gmapsUrl}
                placeholder="https://www.google.com/maps/place/..."
                on:paste={() => setTimeout(extractFromGoogleMaps, 100)}
              />
              <button
                type="button"
                class="btn-extract"
                on:click={extractFromGoogleMaps}
                disabled={extracting || !gmapsUrl}
              >
                {#if extracting}
                  <span class="spinner"></span>
                {:else}
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="M12 3v9l4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/>
                  </svg>
                {/if}
                Extract
              </button>
            </div>
            {#if extractionSuccess}
              <div class="extraction-success">{extractionSuccess}</div>
            {/if}
          </div>

          {#if error}
            <div class="error">{error}</div>
          {/if}

          <div class="form-grid">
            <div class="form-group full-width">
              <label for="name">Restaurant Name</label>
              <input id="name" type="text" bind:value={form.name} placeholder="e.g. Takumi Ramen" required />
            </div>

            <div class="form-group full-width">
              <label for="description">Description</label>
              <textarea id="description" bind:value={form.description} rows="3" placeholder="What makes this place special?"></textarea>
            </div>

            <div class="form-group full-width">
              <label for="address">Address</label>
              <div class="input-with-button">
                <input id="address" type="text" bind:value={form.address} placeholder="Street, City" required />
                <button type="button" class="btn-secondary" on:click={lookupAddress}>
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 16l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  Lookup
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="lat">Latitude</label>
              <input id="lat" type="text" bind:value={form.lat} placeholder="48.1351" required />
            </div>

            <div class="form-group">
              <label for="lng">Longitude</label>
              <input id="lng" type="text" bind:value={form.lng} placeholder="11.5820" required />
            </div>

            <div class="form-group">
              <label for="cuisine">Cuisine Type</label>
              <input id="cuisine" type="text" bind:value={form.cuisine} placeholder="Japanese, Thai, etc." />
            </div>

            <div class="form-group">
              <label for="origin">Country of Origin</label>
              <div class="input-with-flag">
                <input id="origin" type="text" bind:value={form.origin} placeholder="Japan, Thailand, etc." />
                {#if form.origin}
                  <span class="flag-preview">{getFlag(form.origin)}</span>
                {/if}
              </div>
            </div>

            <div class="form-group full-width">
              <label>Rating</label>
              <div class="rating-picker">
                {#each [1, 2, 3, 4, 5] as r}
                  <button
                    type="button"
                    class="rating-btn"
                    class:active={form.rating >= r}
                    on:click={() => form.rating = r}
                    aria-label="{r} bowls"
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path d="M4 12 Q12 16 20 12 Q20 20 12 22 Q4 20 4 12Z" />
                      <ellipse cx="12" cy="12" rx="8" ry="2.5" fill="none" stroke-width="1.5"/>
                    </svg>
                  </button>
                {/each}
                <span class="rating-label">{form.rating} bowl{form.rating !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div class="form-group full-width">
              <label>Tags</label>
              <div class="tag-toggles">
                <label class="tag-toggle">
                  <input type="checkbox" bind:checked={form.is_new} />
                  <span class="tag-badge tag-new">NEW</span>
                  <span class="tag-label">Mark as new restaurant</span>
                </label>
                <label class="tag-toggle">
                  <input type="checkbox" bind:checked={form.is_hot} />
                  <span class="tag-badge tag-hot">HOT</span>
                  <span class="tag-label">Mark as hot/popular</span>
                </label>
              </div>
            </div>

            <div class="form-group full-width">
              <label>Photos</label>
              <div class="image-upload-area">
                {#if form.images.length > 0}
                  <div class="image-grid">
                    {#each form.images as image, index}
                      <div class="image-preview">
                        <img src={image} alt="Restaurant" />
                        <button type="button" class="remove-image" on:click={() => removeImage(index)} aria-label="Remove image">
                          <svg viewBox="0 0 24 24" width="14" height="14">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                          </svg>
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}
                <label class="upload-button" class:uploading={uploadingImage}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" on:change={handleImageUpload} disabled={uploadingImage} />
                  {#if uploadingImage}
                    <span>Uploading...</span>
                  {:else}
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span>Add Photo</span>
                  {/if}
                </label>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary btn-large" disabled={saving}>
              {saving ? 'Saving...' : (currentlyEditing ? 'Update Restaurant' : 'Add Restaurant')}
            </button>
          </div>
        </form>
      {:else}
        <!-- Restaurant List -->
        <button class="add-restaurant-btn" on:click={startCreate}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Add New Restaurant
        </button>

        <div class="restaurant-grid">
          {#each $restaurants as restaurant (restaurant.id)}
            <div class="restaurant-card" class:hidden-restaurant={restaurant.hidden}>
              <div class="card-image">
                {#if restaurant.images?.length > 0}
                  <img src={restaurant.images[0]} alt={restaurant.name} />
                {:else}
                  <div class="no-image">
                    <span class="flag-large">{getFlag(restaurant.origin || restaurant.cuisine)}</span>
                  </div>
                {/if}
                {#if restaurant.hidden}
                  <span class="hidden-badge">Hidden</span>
                {/if}
              </div>
              <div class="card-content">
                <div class="card-header">
                  <h4>{restaurant.name}</h4>
                  <span class="cuisine-tag">{restaurant.cuisine || 'Asian'}</span>
                </div>
                <BowlRating rating={restaurant.rating} size="sm" />
                <p class="card-address">{restaurant.address}</p>
              </div>
              <div class="card-actions">
                <button
                  class="btn-icon"
                  class:active={restaurant.hidden}
                  on:click={() => handleToggleHidden(restaurant)}
                  aria-label={restaurant.hidden ? 'Show' : 'Hide'}
                  title={restaurant.hidden ? 'Show restaurant' : 'Hide restaurant'}
                >
                  {#if restaurant.hidden}
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" fill="none"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
                    </svg>
                  {:else}
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="2" fill="none"/>
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  {/if}
                </button>
                <button class="btn-icon" on:click={() => startEdit(restaurant)} aria-label="Edit">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" fill="none"/>
                  </svg>
                </button>
                <button class="btn-icon danger" on:click={() => handleDelete(restaurant)} aria-label="Delete">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>

        {#if $restaurants.length === 0}
          <div class="empty-state">
            <p>No restaurants yet</p>
            <span>Add your first Asian restaurant to get started</span>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .admin-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: var(--space-md);
  }

  .admin-panel {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    width: 100%;
    max-width: 720px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .header-left h2 {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .auth-badge {
    font-size: 0.75rem;
    font-weight: 500;
    color: #059669;
    background: #d1fae5;
    padding: 2px 8px;
    border-radius: 9999px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: none;
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    transition: all 0.15s;
  }

  .close-btn:hover {
    color: var(--color-text);
    background: var(--color-bg-alt);
  }

  .admin-content {
    padding: var(--space-lg);
    overflow-y: auto;
  }

  /* Login styles */
  .login-container {
    text-align: center;
    padding: var(--space-xl) 0;
  }

  .login-icon {
    color: var(--color-text-muted);
    margin-bottom: var(--space-md);
  }

  .login-container h3 {
    font-size: 1.25rem;
    margin-bottom: var(--space-xs);
  }

  .login-container p {
    color: var(--color-text-muted);
    margin-bottom: var(--space-lg);
  }

  .login-form {
    max-width: 300px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  /* Google Maps extraction */
  .gmaps-extract {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .gmaps-extract label {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-text-muted);
    margin-bottom: var(--space-sm);
  }

  .gmaps-input-row {
    display: flex;
    gap: var(--space-sm);
  }

  .gmaps-input-row input {
    flex: 1;
    font-size: 0.875rem;
  }

  .btn-extract {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 10px 16px;
    font-size: 0.875rem;
    font-weight: 500;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: var(--radius-md);
    transition: all 0.15s;
    white-space: nowrap;
  }

  .btn-extract:hover:not(:disabled) {
    background: #3367d6;
  }

  .btn-extract:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .extraction-success {
    margin-top: var(--space-sm);
    font-size: 0.8125rem;
    color: #059669;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .extraction-success::before {
    content: '✓';
    font-weight: bold;
  }

  /* Form styles */
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
  }

  .form-header h3 {
    font-size: 1.125rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-text-muted);
  }

  input, textarea {
    width: 100%;
    padding: 10px 14px;
    font-family: inherit;
    font-size: 0.9375rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(196, 112, 79, 0.1);
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }

  .input-with-button {
    display: flex;
    gap: var(--space-sm);
  }

  .input-with-button input {
    flex: 1;
  }

  .input-with-flag {
    position: relative;
  }

  .input-with-flag input {
    padding-right: 40px;
  }

  .flag-preview {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.25rem;
  }

  .rating-picker {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .rating-btn {
    background: none;
    border: none;
    padding: 4px;
    fill: var(--color-border);
    stroke: var(--color-border);
    transition: all 0.15s;
    border-radius: var(--radius-sm);
  }

  .rating-btn:hover {
    background: var(--color-bg);
  }

  .rating-btn.active {
    fill: var(--color-accent);
    stroke: var(--color-accent);
  }

  .rating-label {
    margin-left: var(--space-sm);
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  /* Tag toggles */
  .tag-toggles {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .tag-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background 0.15s;
  }

  .tag-toggle:hover {
    background: var(--color-bg-alt);
  }

  .tag-toggle input {
    width: auto;
    margin: 0;
    cursor: pointer;
  }

  .tag-badge {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 3px 8px;
    border-radius: 4px;
  }

  .tag-badge.tag-new {
    background: #10b981;
    color: white;
  }

  .tag-badge.tag-hot {
    background: #ef4444;
    color: white;
  }

  .tag-label {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  /* Image upload */
  .image-upload-area {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: var(--space-sm);
  }

  .image-preview {
    position: relative;
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .remove-image {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    transition: background 0.15s;
  }

  .remove-image:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  .upload-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .upload-button:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: rgba(196, 112, 79, 0.05);
  }

  .upload-button.uploading {
    opacity: 0.6;
    cursor: wait;
  }

  .upload-button input {
    display: none;
  }

  .form-actions {
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border);
  }

  /* Restaurant grid */
  .add-restaurant-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.9375rem;
    font-weight: 500;
    transition: background 0.15s;
    margin-bottom: var(--space-lg);
  }

  .add-restaurant-btn:hover {
    background: var(--color-accent-hover);
  }

  .restaurant-grid {
    display: grid;
    gap: var(--space-md);
  }

  .restaurant-card {
    display: grid;
    grid-template-columns: 100px 1fr auto;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    align-items: center;
  }

  .card-image {
    width: 100px;
    height: 80px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    position: relative;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hidden-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .hidden-restaurant {
    opacity: 0.6;
  }

  .hidden-restaurant .card-image img {
    filter: grayscale(50%);
  }

  .btn-icon.active {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .no-image {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-alt);
  }

  .flag-large {
    font-size: 2rem;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    min-width: 0;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .card-header h4 {
    font-size: 1rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cuisine-tag {
    font-size: 0.75rem;
    color: var(--color-accent);
    background: rgba(196, 112, 79, 0.1);
    padding: 2px 8px;
    border-radius: 9999px;
    flex-shrink: 0;
  }

  .card-address {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-actions {
    display: flex;
    gap: var(--space-xs);
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    transition: all 0.15s;
  }

  .btn-icon:hover {
    border-color: var(--color-text-muted);
    color: var(--color-text);
  }

  .btn-icon.danger:hover {
    border-color: #ef4444;
    color: #ef4444;
    background: #fef2f2;
  }

  .empty-state {
    text-align: center;
    padding: var(--space-xl);
    color: var(--color-text-muted);
  }

  .empty-state p {
    font-weight: 500;
    margin-bottom: var(--space-xs);
  }

  /* Buttons */
  .btn-primary {
    padding: 10px 20px;
    font-size: 0.9375rem;
    font-weight: 500;
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    transition: background 0.15s, opacity 0.15s;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary.btn-large {
    width: 100%;
    padding: 14px 24px;
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 10px 16px;
    font-size: 0.875rem;
    font-weight: 500;
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: all 0.15s;
    white-space: nowrap;
  }

  .btn-secondary:hover {
    background: var(--color-bg-alt);
    border-color: var(--color-text-muted);
  }

  .btn-ghost {
    padding: 8px 12px;
    font-size: 0.875rem;
    font-weight: 500;
    background: none;
    color: var(--color-text-muted);
    border: none;
    border-radius: var(--radius-md);
    transition: all 0.15s;
  }

  .btn-ghost:hover {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .error {
    padding: var(--space-sm) var(--space-md);
    background: #fef2f2;
    color: #dc2626;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
  }

  @media (max-width: 640px) {
    .admin-panel {
      max-height: 100vh;
      border-radius: 0;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-group.full-width {
      grid-column: 1;
    }

    .restaurant-card {
      grid-template-columns: 80px 1fr;
      grid-template-rows: auto auto;
    }

    .card-actions {
      grid-column: 1 / -1;
      justify-content: flex-end;
    }
  }
</style>

<script>
  import { onMount } from 'svelte'
  import Map from './components/Map.svelte'
  import RestaurantList from './components/RestaurantList.svelte'
  import RestaurantCard from './components/RestaurantCard.svelte'
  import SearchBar from './components/SearchBar.svelte'
  import CategoryFilter from './components/CategoryFilter.svelte'
  import SortSelector from './components/SortSelector.svelte'
  import AdminPanel from './components/AdminPanel.svelte'
  import { restaurants, selectedRestaurant, editingRestaurant, fetchRestaurants, fetchCategories } from './stores/restaurants.js'
  import { isAuthenticated, logout } from './stores/auth.js'

  let showAdmin = false
  let showImprint = false

  function openAdminForEdit() {
    showAdmin = true
  }

  async function handleCloseAdmin() {
    showAdmin = false
    editingRestaurant.set(null)
    // Refetch without hidden restaurants for public view
    await fetchRestaurants(false)
  }

  async function handleLogout() {
    await logout()
    // Refetch without hidden restaurants
    await fetchRestaurants(false)
  }

  onMount(() => {
    fetchRestaurants()
    fetchCategories()
  })
</script>

<div class="app">
  <header class="header">
    <div class="header-content">
      <div class="brand">
        <h1 class="logo">
          <span class="logo-text">my</span><span class="logo-highlight">asian</span><span class="logo-text">munich</span>
        </h1>
      </div>
      <div class="header-actions">
        <button class="imprint-btn" on:click={() => showImprint = true}>Imprint</button>
        {#if $isAuthenticated}
          <button class="header-btn" on:click={handleLogout} title="Logout">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        {/if}
        <button class="header-btn" on:click={() => showAdmin = true} title="Admin">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
      </div>
    </div>
  </header>

  {#if showAdmin}
    <AdminPanel onClose={handleCloseAdmin} />
  {/if}

  {#if showImprint}
    <div class="imprint-overlay">
      <div class="imprint-modal">
        <button class="imprint-close" on:click={() => showImprint = false}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <h2>Impressum</h2>
        <div class="imprint-content">
          <p><strong>Angaben gem. 5 TMG</strong></p>
          <p>
            J. Fordemann<br>
            Theresienhoehe 6<br>
            80339 Munchen<br>
            Deutschland
          </p>
          <p><strong>Kontakt</strong></p>
          <p>
            E-Mail: mail@myasianmunich.de
          </p>
          <p><strong>Haftungsausschluss</strong></p>
          <p>
            Diese Website dient ausschliesslich der privaten Information uber asiatische Restaurants in Muenchen.
            Alle Angaben ohne Gewaehr. Fur die Inhalte verlinkter externer Seiten sind ausschliesslich deren Betreiber verantwortlich.
          </p>
        </div>
      </div>
    </div>
  {/if}

  <main class="main">
    <aside class="sidebar">
      <div class="filters">
        <SearchBar />
        <CategoryFilter />
      </div>
      <div class="list-header">
        <span class="list-count">{$restaurants.length} restaurant{$restaurants.length !== 1 ? 's' : ''}</span>
        <SortSelector />
      </div>
      <RestaurantList />
    </aside>

    <div class="map-container">
      <Map />
      {#if $selectedRestaurant}
        <RestaurantCard restaurant={$selectedRestaurant} onEdit={openAdminForEdit} />
      {/if}
    </div>
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg);
  }

  .header {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-sm) var(--space-lg);
  }

  .header-content {
    max-width: 1800px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    display: flex;
    gap: 0;
  }

  .logo-text {
    color: var(--color-text-muted);
  }

  .logo-highlight {
    color: var(--color-accent);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .header-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    transition: all 0.15s;
  }

  .header-btn:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }

  .imprint-btn {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    background: none;
    border: none;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    transition: all 0.15s;
  }

  .imprint-btn:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }

  /* Imprint Modal */
  .imprint-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    padding: var(--space-md);
  }

  .imprint-modal {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .imprint-modal h2 {
    font-size: 1.25rem;
    margin-bottom: var(--space-lg);
    color: var(--color-text);
  }

  .imprint-close {
    position: absolute;
    top: var(--space-md);
    right: var(--space-md);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-text-muted);
    border-radius: var(--radius-sm);
    transition: all 0.15s;
  }

  .imprint-close:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }

  .imprint-content {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--color-text);
  }

  .imprint-content p {
    margin-bottom: var(--space-md);
  }

  .imprint-content strong {
    color: var(--color-text);
  }

  .main {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .sidebar {
    width: 400px;
    min-width: 400px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.03);
  }

  .filters {
    padding: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    background: var(--color-bg);
  }

  .list-header {
    padding: var(--space-sm) var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .list-count {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .map-container {
    flex: 1;
    position: relative;
  }

  @media (max-width: 900px) {
    .sidebar {
      width: 340px;
      min-width: 340px;
    }
  }

  @media (max-width: 768px) {
    .header {
      padding: var(--space-sm) var(--space-md);
    }

    .logo {
      font-size: 1rem;
    }

    .imprint-btn {
      display: none;
    }

    .main {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      min-width: unset;
      max-height: 45%;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    }

    .filters {
      padding: var(--space-md);
    }

    .list-header {
      padding: var(--space-xs) var(--space-md);
    }

    .imprint-modal {
      padding: var(--space-lg);
    }
  }
</style>

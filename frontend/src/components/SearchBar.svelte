<script>
  import { searchQuery } from '../stores/restaurants.js'

  let inputValue = ''
  let debounceTimer

  function handleInput(e) {
    inputValue = e.target.value
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchQuery.set(inputValue)
    }, 200)
  }

  function clearSearch() {
    inputValue = ''
    searchQuery.set('')
  }
</script>

<div class="search-bar">
  <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M16 16l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
  <input
    type="text"
    placeholder="Search restaurants..."
    value={inputValue}
    on:input={handleInput}
  />
  {#if inputValue}
    <button class="clear-btn" on:click={clearSearch} aria-label="Clear search">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  {/if}
</div>

<style>
  .search-bar {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: var(--space-sm);
    color: var(--color-text-muted);
    pointer-events: none;
  }

  input {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    padding-left: calc(var(--space-sm) + 18px + var(--space-sm));
    padding-right: calc(var(--space-sm) + 16px + var(--space-sm));
    font-size: 0.9375rem;
    font-family: inherit;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  input::placeholder {
    color: var(--color-text-muted);
  }

  input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(196, 112, 79, 0.1);
  }

  .clear-btn {
    position: absolute;
    right: var(--space-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: var(--color-bg-alt);
    border: none;
    border-radius: 50%;
    color: var(--color-text-muted);
    transition: color 0.15s ease, background-color 0.15s ease;
  }

  .clear-btn:hover {
    background: var(--color-border);
    color: var(--color-text);
  }
</style>

<script>
  import { sortBy, sortOptions } from '../stores/restaurants.js'
</script>

<div class="sort-selector">
  <svg viewBox="0 0 24 24" width="14" height="14" class="sort-icon">
    <path d="M3 6h18M6 12h12M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
  <select bind:value={$sortBy}>
    {#each sortOptions as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>

<style>
  .sort-selector {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    position: relative;
  }

  .sort-icon {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  select {
    appearance: none;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 6px 28px 6px 8px;
    font-family: inherit;
    font-size: 0.75rem;
    color: var(--color-text);
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6560' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    transition: border-color 0.15s;
  }

  select:hover {
    border-color: var(--color-text-muted);
  }

  select:focus {
    outline: none;
    border-color: var(--color-accent);
  }
</style>

<script>
  import { categories, selectedCuisine, selectedOrigin } from '../stores/restaurants.js'
</script>

<div class="category-filter">
  <select
    bind:value={$selectedCuisine}
    class:active={$selectedCuisine}
  >
    <option value="">All cuisines</option>
    {#each $categories.cuisines as cuisine}
      <option value={cuisine}>{cuisine}</option>
    {/each}
  </select>

  <select
    bind:value={$selectedOrigin}
    class:active={$selectedOrigin}
  >
    <option value="">All origins</option>
    {#each $categories.origins as origin}
      <option value={origin}>{origin}</option>
    {/each}
  </select>
</div>

<style>
  .category-filter {
    display: flex;
    gap: var(--space-sm);
  }

  select {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    font-size: 0.875rem;
    font-family: inherit;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%236b6560' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--space-sm) center;
    padding-right: calc(var(--space-md) + 12px);
  }

  select:hover {
    border-color: var(--color-text-muted);
  }

  select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  select.active {
    color: var(--color-text);
    border-color: var(--color-accent);
    background-color: rgba(196, 112, 79, 0.05);
  }
</style>

<script>
  import { filteredRestaurants, selectedRestaurant, selectRestaurant } from '../stores/restaurants.js'
  import { getFlag } from '../lib/flags.js'
  import BowlRating from './BowlRating.svelte'
</script>

<div class="restaurant-list">
  {#if $filteredRestaurants.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="40" height="40">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M16 16l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <p>No restaurants found</p>
      <span>Try adjusting your filters</span>
    </div>
  {:else}
    {#each $filteredRestaurants as restaurant (restaurant.id)}
      <button
        class="restaurant-item"
        class:selected={$selectedRestaurant?.id === restaurant.id}
        on:click={() => selectRestaurant(restaurant)}
      >
        <div class="item-flag">
          <span class="flag">{getFlag(restaurant.origin || restaurant.cuisine)}</span>
        </div>
        <div class="item-content">
          <div class="item-header">
            <h3 class="item-name">{restaurant.name}</h3>
            {#if restaurant.is_new}<span class="list-tag tag-new">NEW</span>{/if}
            {#if restaurant.is_hot}<span class="list-tag tag-hot">HOT</span>{/if}
          </div>
          <div class="item-footer">
            <BowlRating rating={restaurant.rating} size="sm" />
            <span class="item-cuisine">{restaurant.cuisine}</span>
            {#if restaurant.origin}
              <span class="item-origin">{restaurant.origin}</span>
            {/if}
          </div>
        </div>
        <div class="item-arrow">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
      </button>
    {/each}
  {/if}
</div>

<style>
  .restaurant-list {
    flex: 1;
    overflow-y: auto;
  }

  .empty-state {
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-muted);
  }

  .empty-icon {
    margin-bottom: var(--space-md);
    opacity: 0.5;
  }

  .empty-state p {
    font-weight: 500;
    margin-bottom: var(--space-xs);
    color: var(--color-text);
  }

  .empty-state span {
    font-size: 0.875rem;
  }

  .restaurant-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: none;
    border: none;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    transition: background-color 0.15s;
    cursor: pointer;
  }

  .restaurant-item:hover {
    background-color: var(--color-bg);
  }

  .restaurant-item.selected {
    background: linear-gradient(90deg, rgba(196, 112, 79, 0.1) 0%, var(--color-bg) 100%);
    border-left: 3px solid var(--color-accent);
    padding-left: calc(var(--space-md) - 3px);
  }

  .item-flag {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    border-radius: var(--radius-md);
    flex-shrink: 0;
  }

  .restaurant-item.selected .item-flag {
    background: white;
    box-shadow: 0 2px 8px rgba(196, 112, 79, 0.15);
  }

  .flag {
    font-size: 1.5rem;
    line-height: 1;
  }

  .item-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-sm);
  }

  .item-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-cuisine {
    font-size: 0.75rem;
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .item-footer {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .item-origin {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .list-tag {
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 2px 5px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .tag-new {
    background: #10b981;
    color: white;
  }

  .tag-hot {
    background: #ef4444;
    color: white;
  }

  .item-arrow {
    color: var(--color-border);
    transition: color 0.15s, transform 0.15s;
  }

  .restaurant-item:hover .item-arrow {
    color: var(--color-text-muted);
  }

  .restaurant-item.selected .item-arrow {
    color: var(--color-accent);
    transform: translateX(2px);
  }
</style>

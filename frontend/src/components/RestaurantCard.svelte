<script>
  import { clearSelection, editingRestaurant } from '../stores/restaurants.js'
  import { isAuthenticated } from '../stores/auth.js'
  import { getFlag } from '../lib/flags.js'
  import BowlRating from './BowlRating.svelte'

  export let restaurant
  export let onEdit = null

  function handleEdit() {
    editingRestaurant.set(restaurant)
    if (onEdit) onEdit()
  }

  let currentImageIndex = 0

  $: googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
  $: hasImages = restaurant.images && restaurant.images.length > 0
  $: flag = getFlag(restaurant.origin || restaurant.cuisine)
  $: addedDate = restaurant.created_at ? new Date(restaurant.created_at).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' }) : null

  function nextImage() {
    if (hasImages) {
      currentImageIndex = (currentImageIndex + 1) % restaurant.images.length
    }
  }

  function prevImage() {
    if (hasImages) {
      currentImageIndex = (currentImageIndex - 1 + restaurant.images.length) % restaurant.images.length
    }
  }
</script>

<div class="restaurant-card">
  <div class="card-buttons">
    {#if $isAuthenticated}
      <button class="edit-btn" on:click={handleEdit} aria-label="Edit restaurant">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      </button>
    {/if}
    <button class="close-btn" on:click={clearSelection} aria-label="Close">
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  {#if hasImages}
    <div class="image-container">
      <img src={restaurant.images[currentImageIndex]} alt={restaurant.name} />
      {#if restaurant.is_new || restaurant.is_hot}
        <div class="card-tags">
          {#if restaurant.is_new}<span class="tag tag-new">NEW</span>{/if}
          {#if restaurant.is_hot}<span class="tag tag-hot">HOT</span>{/if}
        </div>
      {/if}
      {#if restaurant.images.length > 1}
        <div class="image-nav">
          <button class="nav-btn" on:click={prevImage} aria-label="Previous image">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="image-dots">
            {#each restaurant.images as _, i}
              <span class="dot" class:active={i === currentImageIndex}></span>
            {/each}
          </div>
          <button class="nav-btn" on:click={nextImage} aria-label="Next image">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <div class="image-placeholder">
      <span class="placeholder-flag">{flag}</span>
      {#if restaurant.is_new || restaurant.is_hot}
        <div class="card-tags">
          {#if restaurant.is_new}<span class="tag tag-new">NEW</span>{/if}
          {#if restaurant.is_hot}<span class="tag tag-hot">HOT</span>{/if}
        </div>
      {/if}
    </div>
  {/if}

  <div class="card-content">
    <div class="card-header">
      <div class="header-main">
        <span class="card-flag">{flag}</span>
        <h2 class="restaurant-name">{restaurant.name}</h2>
      </div>
      <BowlRating rating={restaurant.rating} size="md" />
    </div>

    <div class="meta">
      <span class="cuisine">{restaurant.cuisine}</span>
      {#if restaurant.origin}
        <span class="divider"></span>
        <span class="origin">{restaurant.origin}</span>
      {/if}
    </div>

    {#if restaurant.description}
      <p class="description">{restaurant.description}</p>
    {/if}

    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="address-link"
    >
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
      </svg>
      <span>{restaurant.address}</span>
      <svg class="external-icon" viewBox="0 0 24 24" width="14" height="14">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    </a>

    {#if addedDate}
      <div class="added-date">Added {addedDate}</div>
    {/if}
  </div>
</div>

<style>
  .restaurant-card {
    position: absolute;
    bottom: var(--space-lg);
    left: var(--space-lg);
    right: var(--space-lg);
    max-width: 420px;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    z-index: 1000;
  }

  .card-buttons {
    position: absolute;
    top: var(--space-sm);
    right: var(--space-sm);
    display: flex;
    gap: var(--space-xs);
    z-index: 1;
  }

  .close-btn,
  .edit-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    border: none;
    border-radius: 50%;
    color: var(--color-text-muted);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.15s;
    cursor: pointer;
  }

  .close-btn:hover,
  .edit-btn:hover {
    color: var(--color-text);
    background: white;
  }

  .edit-btn:hover {
    color: var(--color-accent);
  }

  .image-container {
    position: relative;
    height: 180px;
    overflow: hidden;
  }

  .image-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-tags {
    position: absolute;
    top: var(--space-sm);
    left: var(--space-sm);
    display: flex;
    gap: var(--space-xs);
    z-index: 1;
  }

  .tag {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 3px 8px;
    border-radius: 4px;
  }

  .tag-new {
    background: #10b981;
    color: white;
  }

  .tag-hot {
    background: #ef4444;
    color: white;
  }

  .image-nav {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm);
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
  }

  .nav-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .nav-btn:hover {
    background: white;
    transform: scale(1.05);
  }

  .image-dots {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    transition: all 0.15s;
  }

  .dot.active {
    background: white;
    width: 20px;
    border-radius: 4px;
  }

  .image-placeholder {
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-alt) 100%);
  }

  .placeholder-flag {
    font-size: 4rem;
    opacity: 0.8;
  }

  .card-content {
    padding: var(--space-lg);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    min-width: 0;
  }

  .card-flag {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .restaurant-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 0.875rem;
    margin-bottom: var(--space-md);
  }

  .cuisine {
    color: var(--color-accent);
    font-weight: 500;
  }

  .divider {
    width: 4px;
    height: 4px;
    background: var(--color-border);
    border-radius: 50%;
  }

  .origin {
    color: var(--color-text-muted);
  }

  .description {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--color-text);
    margin-bottom: var(--space-md);
  }

  .address-link {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-decoration: none;
    background: var(--color-bg);
    border-radius: var(--radius-md);
    transition: all 0.15s;
  }

  .address-link:hover {
    background: var(--color-bg-alt);
    color: var(--color-accent);
  }

  .address-link span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .external-icon {
    opacity: 0.5;
    flex-shrink: 0;
  }

  .address-link:hover .external-icon {
    opacity: 1;
  }

  .added-date {
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-border);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-align: center;
  }

  @media (max-width: 768px) {
    .restaurant-card {
      left: var(--space-sm);
      right: var(--space-sm);
      bottom: var(--space-sm);
      max-width: none;
    }

    .image-container {
      height: 150px;
    }
  }
</style>

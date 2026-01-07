<script>
  export let rating = 0
  export let size = 'md'

  const maxBowls = 5
</script>

<div class="bowl-rating {size}">
  {#each Array(maxBowls) as _, i}
    <svg
      class="bowl {i < rating ? 'filled' : 'empty'}"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M4 12 Q12 16 20 12 Q20 20 12 22 Q4 20 4 12Z" />
      <ellipse cx="12" cy="12" rx="8" ry="2.5" fill="none" stroke-width="1.5"/>
    </svg>
  {/each}
  <span class="sr-only">{rating} out of {maxBowls} bowls</span>
</div>

<style>
  .bowl-rating {
    display: flex;
    gap: 2px;
  }

  .bowl-rating.sm .bowl {
    width: 16px;
    height: 16px;
  }

  .bowl-rating.md .bowl {
    width: 20px;
    height: 20px;
  }

  .bowl-rating.lg .bowl {
    width: 24px;
    height: 24px;
  }

  .bowl {
    fill: var(--color-border);
    stroke: var(--color-border);
  }

  .bowl.filled {
    fill: var(--color-accent);
    stroke: var(--color-accent);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>

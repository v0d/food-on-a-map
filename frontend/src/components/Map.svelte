<script>
  import { onMount, onDestroy } from 'svelte'
  import L from 'leaflet'
  import { filteredRestaurants, selectedRestaurant, selectRestaurant } from '../stores/restaurants.js'
  import { getFlagForRestaurant } from '../lib/flags.js'

  let mapContainer
  let map
  let markers = []

  // Munich center
  const MUNICH_CENTER = [48.1351, 11.5820]
  const DEFAULT_ZOOM = 13

  // Create flag marker icon
  const createMarkerIcon = (restaurant, isSelected) => {
    const flag = getFlagForRestaurant(restaurant)
    return L.divIcon({
      className: 'flag-marker',
      html: `
        <div class="marker-wrapper ${isSelected ? 'selected' : ''}">
          <div class="marker-flag">${flag}</div>
          <div class="marker-shadow"></div>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 48]
    })
  }

  onMount(() => {
    map = L.map(mapContainer, {
      zoomControl: false
    }).setView(MUNICH_CENTER, DEFAULT_ZOOM)

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Use a nicer map style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(map)
  })

  onDestroy(() => {
    if (map) {
      map.remove()
    }
  })

  // Update markers when restaurants change
  $: if (map && $filteredRestaurants) {
    // Clear existing markers
    markers.forEach(m => map.removeLayer(m))
    markers = []

    // Add new markers
    $filteredRestaurants.forEach(restaurant => {
      const isSelected = $selectedRestaurant?.id === restaurant.id
      const marker = L.marker([restaurant.lat, restaurant.lng], {
        icon: createMarkerIcon(restaurant, isSelected)
      })

      marker.on('click', () => {
        selectRestaurant(restaurant)
      })

      marker.addTo(map)
      markers.push(marker)
    })
  }

  // Pan to selected restaurant
  $: if (map && $selectedRestaurant) {
    map.setView([$selectedRestaurant.lat, $selectedRestaurant.lng], 15, {
      animate: true,
      duration: 0.5
    })

    // Update marker icons to show selection
    markers.forEach((marker, idx) => {
      const restaurant = $filteredRestaurants[idx]
      if (restaurant) {
        const isSelected = restaurant.id === $selectedRestaurant.id
        marker.setIcon(createMarkerIcon(restaurant, isSelected))
      }
    })
  }
</script>

<div class="map" bind:this={mapContainer}></div>

<style>
  .map {
    width: 100%;
    height: 100%;
  }

  :global(.flag-marker) {
    background: transparent !important;
    border: none !important;
  }

  :global(.marker-wrapper) {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.2s ease;
    cursor: pointer;
  }

  :global(.marker-wrapper:hover),
  :global(.marker-wrapper.selected) {
    transform: scale(1.15) translateY(-4px);
    z-index: 1000 !important;
  }

  :global(.marker-flag) {
    font-size: 28px;
    line-height: 1;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    background: white;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  :global(.marker-wrapper.selected .marker-flag) {
    border-color: var(--color-accent, #c4704f);
    box-shadow: 0 4px 12px rgba(196, 112, 79, 0.4);
  }

  :global(.marker-shadow) {
    width: 20px;
    height: 6px;
    background: radial-gradient(ellipse, rgba(0,0,0,0.2) 0%, transparent 70%);
    margin-top: 2px;
  }
</style>

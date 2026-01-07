import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Database from 'better-sqlite3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, 'data', 'restaurants.db')
const csvPath = join(__dirname, '..', 'Asian Restaurants in München.csv')
const uploadsDir = join(__dirname, '..', 'frontend', 'public', 'uploads')

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true })
}

// Cuisine detection
const cuisinePatterns = [
  { pattern: /hong kong|cantonese|老香港/i, cuisine: 'Cantonese', origin: 'Hong Kong' },
  { pattern: /korean|한|hansik|hanssam|arisu|bbq.*korean|korean.*bbq|yumira|m-a-t|koreanische/i, cuisine: 'Korean', origin: 'South Korea' },
  { pattern: /sichuan|szechuan|malatang|四川|麻辣/i, cuisine: 'Sichuan', origin: 'China' },
  { pattern: /thai|noppakao|krua/i, cuisine: 'Thai', origin: 'Thailand' },
  { pattern: /vietnam|viet|pho|vo|bi béo|mai garten/i, cuisine: 'Vietnamese', origin: 'Vietnam' },
  { pattern: /japan|sushi|ramen|ohayou|j-bar|izakaya/i, cuisine: 'Japanese', origin: 'Japan' },
  { pattern: /india|bhavan|saravanaa/i, cuisine: 'Indian', origin: 'India' },
  { pattern: /uyghur|taklamakan|xinjiang/i, cuisine: 'Uyghur', origin: 'China' },
  { pattern: /china|chinese|nudel|noodle|杨国福|乡味|bei ling|yan you|song|green oasia|andelong|honghong|jiao|dumpling/i, cuisine: 'Chinese', origin: 'China' },
  { pattern: /asia|asian|fan|mun|jin|slurp|wai/i, cuisine: 'Pan-Asian', origin: null },
]

function detectCuisine(name) {
  for (const { pattern, cuisine, origin } of cuisinePatterns) {
    if (pattern.test(name)) {
      return { cuisine, origin }
    }
  }
  return { cuisine: 'Asian', origin: null }
}

// Extract coordinates from Google Maps page HTML
async function getDetailsFromGoogleMaps(url, name) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow'
    })

    const html = await res.text()

    // Extract coordinates - look for patterns like @48.1234567,11.1234567
    let lat = null, lng = null, address = null

    // Try to find coordinates in the URL or page content
    const coordMatch = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordMatch) {
      lat = parseFloat(coordMatch[1])
      lng = parseFloat(coordMatch[2])
    }

    // Alternative: look for coordinates in meta tags or data
    if (!lat) {
      const metaMatch = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/)
      if (metaMatch) {
        lat = parseFloat(metaMatch[1])
        lng = parseFloat(metaMatch[2])
      }
    }

    // Try to find in window data
    if (!lat) {
      const dataMatch = html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/)
      if (dataMatch) {
        lat = parseFloat(dataMatch[1])
        lng = parseFloat(dataMatch[2])
      }
    }

    // Look for address in various places
    const addressPatterns = [
      /itemprop="streetAddress"[^>]*>([^<]+)</,
      /"address":"([^"]+)"/,
      /München[^"<]*\d{5}/,
    ]

    for (const pattern of addressPatterns) {
      const match = html.match(pattern)
      if (match) {
        address = match[1] || match[0]
        break
      }
    }

    // Get image URL
    let imageUrl = null
    const imgPatterns = [
      /https:\/\/lh5\.googleusercontent\.com\/p\/[A-Za-z0-9_-]+/g,
      /https:\/\/lh3\.googleusercontent\.com\/p\/[A-Za-z0-9_-]+/g,
    ]

    for (const pattern of imgPatterns) {
      const matches = html.match(pattern)
      if (matches && matches.length > 0) {
        imageUrl = matches[0]
        break
      }
    }

    return { lat, lng, address, imageUrl }
  } catch (err) {
    console.error(`  Error fetching Google Maps: ${err.message}`)
    return { lat: null, lng: null, address: null, imageUrl: null }
  }
}

// Geocode using Nominatim as fallback
async function geocode(name, retries = 3) {
  const queries = [
    `${name}, München, Germany`,
    `${name.split(' ')[0]} Restaurant, München`,
    `${name.replace(/[^a-zA-Z\s]/g, '')}, Munich, Germany`,
  ]

  for (const query of queries) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MyAsianMunich/1.0' }
      })
      const data = await res.json()

      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name.split(',').slice(0, 3).join(',').trim()
        }
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 1100))
    } catch (err) {
      console.error(`  Nominatim error: ${err.message}`)
    }
  }

  return null
}

// Download image
async function downloadImage(imageUrl, filename) {
  try {
    // Add size parameter for better quality
    const url = imageUrl.includes('=') ? imageUrl : `${imageUrl}=s800-k-no`
    const res = await fetch(url)
    if (!res.ok) return null

    const buffer = await res.arrayBuffer()
    const filepath = join(uploadsDir, filename)
    writeFileSync(filepath, Buffer.from(buffer))
    return `/uploads/${filename}`
  } catch (err) {
    console.error(`  Download error: ${err.message}`)
    return null
  }
}

// Parse CSV
function parseCSV(content) {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = []
      let current = ''
      let inQuotes = false

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      const obj = {}
      headers.forEach((h, i) => {
        obj[h.trim()] = values[i] || ''
      })
      return obj
    })
    .filter(row => row.Title && row.URL)
}

// Main import
async function importRestaurants() {
  console.log('Reading CSV...')
  const csvContent = readFileSync(csvPath, 'utf-8')
  const restaurants = parseCSV(csvContent)

  console.log(`Found ${restaurants.length} restaurants to import\n`)

  const db = new Database(dbPath)
  db.exec('DELETE FROM restaurants')

  const insert = db.prepare(`
    INSERT INTO restaurants (name, description, address, lat, lng, cuisine, origin, rating, images)
    VALUES (@name, @description, @address, @lat, @lng, @cuisine, @origin, @rating, @images)
  `)

  let imported = 0, failed = 0

  for (let i = 0; i < restaurants.length; i++) {
    const row = restaurants[i]
    const name = row.Title

    console.log(`[${i + 1}/${restaurants.length}] ${name}`)

    const { cuisine, origin } = detectCuisine(name)

    // Try Google Maps first
    console.log(`  Fetching from Google Maps...`)
    const gmaps = await getDetailsFromGoogleMaps(row.URL, name)

    let lat = gmaps.lat
    let lng = gmaps.lng
    let address = gmaps.address

    // Fallback to Nominatim if no coordinates
    if (!lat || !lng) {
      console.log(`  Falling back to Nominatim...`)
      const geo = await geocode(name)
      if (geo) {
        lat = geo.lat
        lng = geo.lng
        address = address || geo.address
      }
    }

    // Still no coordinates? Use Munich center + offset
    if (!lat || !lng) {
      console.log(`  Using Munich center with offset...`)
      lat = 48.1351 + (Math.random() - 0.5) * 0.05
      lng = 11.5820 + (Math.random() - 0.5) * 0.05
      address = 'München, Germany'
    }

    // Download image if available
    let images = []
    if (gmaps.imageUrl) {
      const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}-${Date.now()}.jpg`
      const localPath = await downloadImage(gmaps.imageUrl, filename)
      if (localPath) {
        images.push(localPath)
        console.log(`  ✓ Image saved`)
      }
    }

    try {
      insert.run({
        name,
        description: null,
        address: address || 'München, Germany',
        lat,
        lng,
        cuisine,
        origin,
        rating: null,
        images: JSON.stringify(images)
      })

      imported++
      console.log(`  ✓ ${cuisine} | ${origin || 'Unknown'} | (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
    } catch (err) {
      console.log(`  ❌ ${err.message}`)
      failed++
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 500))
  }

  db.close()

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Import complete: ${imported} imported, ${failed} failed`)
}

importRestaurants().catch(console.error)

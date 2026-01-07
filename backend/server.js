import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import restaurantsRouter from './routes/restaurants.js'
import db from './db.js'
import { ADMIN_PASSWORD, createToken, removeToken, isValidToken, requireAuth } from './auth.js'

// Cuisine detection patterns
const cuisinePatterns = [
  { pattern: /hong kong|cantonese|粤|港/i, cuisine: 'Cantonese', origin: 'Hong Kong' },
  { pattern: /korean|한국|한식|hansik|hanssam|arisu|korean.*bbq|bbq.*korean|yumira|koreanisch/i, cuisine: 'Korean', origin: 'South Korea' },
  { pattern: /sichuan|szechuan|malatang|四川|麻辣|川菜/i, cuisine: 'Sichuan', origin: 'China' },
  { pattern: /thai|ไทย|noppakao|krua/i, cuisine: 'Thai', origin: 'Thailand' },
  { pattern: /vietnam|việt|phở|pho|vo|béo|beo/i, cuisine: 'Vietnamese', origin: 'Vietnam' },
  { pattern: /japan|日本|sushi|ramen|izakaya|ohayou|寿司|ラーメン/i, cuisine: 'Japanese', origin: 'Japan' },
  { pattern: /india|भारत|bhavan|saravanaa|curry/i, cuisine: 'Indian', origin: 'India' },
  { pattern: /uyghur|uighur|taklamakan|xinjiang|新疆/i, cuisine: 'Uyghur', origin: 'China' },
  { pattern: /china|chinese|中国|中餐|nudel|noodle|dumpling|dim sum/i, cuisine: 'Chinese', origin: 'China' },
]

function detectCuisine(name) {
  const lowerName = name.toLowerCase()
  for (const { pattern, cuisine, origin } of cuisinePatterns) {
    if (pattern.test(lowerName)) {
      return { cuisine, origin }
    }
  }
  return { cuisine: 'Asian', origin: null }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// Ensure uploads directory exists
const uploadsDir = join(__dirname, '..', 'frontend', 'public', 'uploads')
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true })
}

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  }
})

// Middleware
app.use(cors())
app.use(express.json())

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body
  if (password === ADMIN_PASSWORD) {
    const token = createToken()
    res.json({ token })
  } else {
    res.status(401).json({ error: 'Invalid password' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) removeToken(token)
  res.json({ success: true })
})

app.get('/api/auth/check', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  res.json({ authenticated: isValidToken(token) })
})

// Image upload route (protected)
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' })
  }
  res.json({ url: `/uploads/${req.file.filename}` })
})

// Extract restaurant data from Google Maps URL (protected)
app.post('/api/extract-gmaps', requireAuth, async (req, res) => {
  const { url } = req.body

  if (!url || !url.includes('google.com/maps')) {
    return res.status(400).json({ error: 'Invalid Google Maps URL' })
  }

  try {
    // Fetch the Google Maps page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow'
    })

    const html = await response.text()

    // Extract name from URL or page
    let name = null
    const urlNameMatch = url.match(/place\/([^/]+)/)
    if (urlNameMatch) {
      name = decodeURIComponent(urlNameMatch[1].replace(/\+/g, ' '))
    }

    // Try to get name from page title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/)
    if (titleMatch && !name) {
      name = titleMatch[1].split(' - ')[0].trim()
    }

    // Extract coordinates
    let lat = null, lng = null
    const coordPatterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/,
    ]

    for (const pattern of coordPatterns) {
      const match = html.match(pattern)
      if (match) {
        lat = parseFloat(match[1])
        lng = parseFloat(match[2])
        // Validate coordinates are reasonable (roughly Europe/Asia)
        if (lat > -90 && lat < 90 && lng > -180 && lng < 180) {
          break
        }
      }
    }

    // Extract address
    let address = null
    const addressPatterns = [
      /"address":"([^"]+)"/,
      /aria-label="Address[^"]*"[^>]*>([^<]+)</,
      /class="[^"]*address[^"]*"[^>]*>([^<]+)</i,
    ]

    for (const pattern of addressPatterns) {
      const match = html.match(pattern)
      if (match) {
        address = match[1].replace(/\\u[\dA-Fa-f]{4}/g, m =>
          String.fromCharCode(parseInt(m.slice(2), 16))
        )
        break
      }
    }

    // Extract image URL
    let imageUrl = null
    const imgPatterns = [
      /https:\/\/lh5\.googleusercontent\.com\/p\/[A-Za-z0-9_-]+/,
      /https:\/\/lh3\.googleusercontent\.com\/p\/[A-Za-z0-9_-]+/,
      /https:\/\/streetviewpixels[^"'\s]+/,
    ]

    for (const pattern of imgPatterns) {
      const match = html.match(pattern)
      if (match) {
        imageUrl = match[0]
        break
      }
    }

    // Download image if found
    let localImageUrl = null
    if (imageUrl) {
      try {
        const imgUrl = imageUrl.includes('=') ? imageUrl : `${imageUrl}=s800-k-no`
        const imgRes = await fetch(imgUrl)
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer()
          const filename = `${uuidv4()}.jpg`
          const filepath = join(uploadsDir, filename)
          writeFileSync(filepath, Buffer.from(buffer))
          localImageUrl = `/uploads/${filename}`
        }
      } catch (err) {
        console.error('Image download failed:', err.message)
      }
    }

    // Detect cuisine from name
    const { cuisine, origin } = name ? detectCuisine(name) : { cuisine: null, origin: null }

    res.json({
      name,
      address,
      lat,
      lng,
      cuisine,
      origin,
      imageUrl: localImageUrl,
      extracted: {
        hasCoordinates: !!(lat && lng),
        hasAddress: !!address,
        hasImage: !!localImageUrl,
      }
    })
  } catch (err) {
    console.error('Google Maps extraction error:', err)
    res.status(500).json({ error: 'Failed to extract data from Google Maps' })
  }
})

// Restaurant routes
app.use('/api/restaurants', restaurantsRouter)

// Categories endpoint
app.get('/api/categories', (req, res) => {
  const cuisines = db.prepare('SELECT DISTINCT cuisine FROM restaurants WHERE cuisine IS NOT NULL ORDER BY cuisine').all()
  const origins = db.prepare('SELECT DISTINCT origin FROM restaurants WHERE origin IS NOT NULL ORDER BY origin').all()

  res.json({
    cuisines: cuisines.map(c => c.cuisine),
    origins: origins.map(o => o.origin)
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Admin password: ${ADMIN_PASSWORD}`)
})

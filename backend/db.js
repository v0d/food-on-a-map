import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, 'data', 'restaurants.db')

const db = new Database(dbPath)

// Enable foreign keys
db.pragma('journal_mode = WAL')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    cuisine TEXT,
    origin TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    images TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Check if we need to seed
const count = db.prepare('SELECT COUNT(*) as count FROM restaurants').get()

if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO restaurants (name, description, address, lat, lng, cuisine, origin, rating, images)
    VALUES (@name, @description, @address, @lat, @lng, @cuisine, @origin, @rating, @images)
  `)

  const seedData = [
    {
      name: 'Takumi',
      description: 'Legendary ramen spot with rich tonkotsu broth. Always a queue, always worth it. Their chashu melts in your mouth.',
      address: 'Heßstraße 71, 80798 München',
      lat: 48.1551,
      lng: 11.5614,
      cuisine: 'Japanese',
      origin: 'Japan',
      rating: 5,
      images: '[]'
    },
    {
      name: 'Banyan',
      description: 'Refined Thai cuisine in elegant surroundings. Great pad thai and their green curry is perfectly balanced.',
      address: 'Maximilianstraße 12, 80539 München',
      lat: 48.1392,
      lng: 11.5849,
      cuisine: 'Thai',
      origin: 'Thailand',
      rating: 4,
      images: '[]'
    },
    {
      name: 'Pho Viet',
      description: 'Authentic Vietnamese pho and banh mi. Family-run, unpretentious, delicious. The pho tai is exceptional.',
      address: 'Türkenstraße 68, 80799 München',
      lat: 48.1543,
      lng: 11.5752,
      cuisine: 'Vietnamese',
      origin: 'Vietnam',
      rating: 4,
      images: '[]'
    }
  ]

  for (const restaurant of seedData) {
    insert.run(restaurant)
  }

  console.log('Database seeded with sample restaurants')
}

export default db

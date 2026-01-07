import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

// GET all restaurants (with optional filters)
router.get('/', (req, res) => {
  const { cuisine, origin, search } = req.query

  let query = 'SELECT * FROM restaurants WHERE 1=1'
  const params = {}

  if (cuisine) {
    query += ' AND cuisine = @cuisine'
    params.cuisine = cuisine
  }

  if (origin) {
    query += ' AND origin = @origin'
    params.origin = origin
  }

  if (search) {
    query += ' AND (name LIKE @search OR description LIKE @search)'
    params.search = `%${search}%`
  }

  query += ' ORDER BY name'

  const restaurants = db.prepare(query).all(params)

  // Parse images JSON
  const parsed = restaurants.map(r => ({
    ...r,
    images: JSON.parse(r.images || '[]')
  }))

  res.json(parsed)
})

// GET single restaurant
router.get('/:id', (req, res) => {
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id)

  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' })
  }

  res.json({
    ...restaurant,
    images: JSON.parse(restaurant.images || '[]')
  })
})

// POST create restaurant (admin)
router.post('/', requireAuth, (req, res) => {
  const { name, description, address, lat, lng, cuisine, origin, rating, images } = req.body

  if (!name || !address || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing required fields: name, address, lat, lng' })
  }

  const result = db.prepare(`
    INSERT INTO restaurants (name, description, address, lat, lng, cuisine, origin, rating, images)
    VALUES (@name, @description, @address, @lat, @lng, @cuisine, @origin, @rating, @images)
  `).run({
    name,
    description: description || null,
    address,
    lat,
    lng,
    cuisine: cuisine || null,
    origin: origin || null,
    rating: rating || null,
    images: JSON.stringify(images || [])
  })

  const newRestaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(result.lastInsertRowid)

  res.status(201).json({
    ...newRestaurant,
    images: JSON.parse(newRestaurant.images || '[]')
  })
})

// PUT update restaurant (admin)
router.put('/:id', requireAuth, (req, res) => {
  const { name, description, address, lat, lng, cuisine, origin, rating, images } = req.body

  const existing = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Restaurant not found' })
  }

  db.prepare(`
    UPDATE restaurants SET
      name = @name,
      description = @description,
      address = @address,
      lat = @lat,
      lng = @lng,
      cuisine = @cuisine,
      origin = @origin,
      rating = @rating,
      images = @images
    WHERE id = @id
  `).run({
    id: req.params.id,
    name: name ?? existing.name,
    description: description ?? existing.description,
    address: address ?? existing.address,
    lat: lat ?? existing.lat,
    lng: lng ?? existing.lng,
    cuisine: cuisine ?? existing.cuisine,
    origin: origin ?? existing.origin,
    rating: rating ?? existing.rating,
    images: images ? JSON.stringify(images) : existing.images
  })

  const updated = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id)

  res.json({
    ...updated,
    images: JSON.parse(updated.images || '[]')
  })
})

// DELETE restaurant (admin)
router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Restaurant not found' })
  }

  db.prepare('DELETE FROM restaurants WHERE id = ?').run(req.params.id)

  res.status(204).send()
})

export default router

# My Asian Munich

A curated guide to Asian restaurants in Munich. Interactive map with filtering, sorting, and admin management.

## Tech Stack

- **Frontend:** Svelte 5 + Vite
- **Backend:** PHP 8+
- **Database:** SQLite
- **Maps:** Leaflet + OpenStreetMap

## Features

- Interactive map with restaurant markers
- Filter by cuisine type and country of origin
- Search by name or description
- Sort by name, rating, or date added
- NEW and HOT tags for restaurants
- Bowl rating system (1-5)
- Google Maps URL extraction for easy data entry
- Image upload support
- Admin panel with authentication
- Hide/show and delete restaurants
- Mobile responsive

## Local Development

### Prerequisites

- Node.js 18+
- PHP 8+ with SQLite extension
- sqlite3 CLI

### Setup

```bash
# Install frontend dependencies
cd frontend
npm install

# Start frontend dev server
npm run dev

# In another terminal, start PHP backend
cd backend-php
php -S localhost:8000
```

The frontend runs on `http://localhost:5173` and proxies API requests to the PHP backend.

### Database

The SQLite database is stored at `backend/data/restaurants.db`.

To view/edit:
```bash
sqlite3 backend/data/restaurants.db
```

## Deployment

### Build & Prepare

```bash
./prepare-deploy.sh
```

This creates a `deploy/` folder with:
- Built frontend assets
- PHP backend (`api/`)
- Database (`api/data/`)
- Uploads folder

### Upload to Host

```bash
cd deploy
rsync -avz -e "ssh -i ~/.ssh/your-key" --exclude='uploads' * user@host:~/yoursite.de/
```

### Server Requirements

- PHP 8+ with PDO SQLite
- Writable directories: `api/data/`, `uploads/`
- `.htaccess` support (Apache) or equivalent nginx config

### Environment

Create `backend-php/.env` with:
```
ADMIN_PASSWORD=your-secure-password
```

## Project Structure

```
my-asian-munich/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map.svelte
│   │   │   ├── RestaurantCard.svelte
│   │   │   ├── RestaurantList.svelte
│   │   │   ├── SearchBar.svelte
│   │   │   ├── CategoryFilter.svelte
│   │   │   ├── SortSelector.svelte
│   │   │   ├── BowlRating.svelte
│   │   │   └── AdminPanel.svelte
│   │   ├── stores/
│   │   │   ├── restaurants.js
│   │   │   └── auth.js
│   │   ├── lib/
│   │   │   └── flags.js
│   │   ├── App.svelte
│   │   └── app.css
│   └── package.json
├── backend-php/
│   ├── index.php          # API routes
│   ├── db.php             # Database connection
│   ├── auth.php           # Authentication
│   └── .htaccess
├── backend/
│   └── data/
│       └── restaurants.db  # SQLite database
├── deploy/                 # Generated deployment folder
├── prepare-deploy.sh
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/restaurants` | List all restaurants |
| GET | `/api/restaurants/:id` | Get single restaurant |
| POST | `/api/restaurants` | Create restaurant (auth) |
| PUT | `/api/restaurants/:id` | Update restaurant (auth) |
| PATCH | `/api/restaurants/:id` | Partial update (auth) |
| DELETE | `/api/restaurants/:id` | Delete restaurant (auth) |
| GET | `/api/categories` | Get cuisines and origins |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/check` | Check auth status |
| POST | `/api/upload` | Upload image (auth) |
| POST | `/api/extract-gmaps` | Extract from Google Maps URL (auth) |

### Query Parameters

`GET /api/restaurants` supports:
- `cuisine` - Filter by cuisine type
- `origin` - Filter by country
- `search` - Search name/description
- `includeHidden` - Include hidden restaurants (auth)

## Database Schema

```sql
CREATE TABLE restaurants (
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
  hidden INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  is_hot INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## License

Private project.

<?php
/**
 * My Asian Munich - PHP Backend API
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simple router
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/api#', '', $path); // Strip /api prefix if present

// Cuisine detection patterns
$cuisinePatterns = [
    ['pattern' => '/hong kong|cantonese|粤|港/i', 'cuisine' => 'Cantonese', 'origin' => 'Hong Kong'],
    ['pattern' => '/korean|한국|한식|hansik|hanssam|arisu|korean.*bbq|bbq.*korean|yumira|koreanisch/i', 'cuisine' => 'Korean', 'origin' => 'South Korea'],
    ['pattern' => '/sichuan|szechuan|malatang|四川|麻辣|川菜/i', 'cuisine' => 'Sichuan', 'origin' => 'China'],
    ['pattern' => '/thai|ไทย|noppakao|krua/i', 'cuisine' => 'Thai', 'origin' => 'Thailand'],
    ['pattern' => '/vietnam|việt|phở|pho|vo|béo|beo/i', 'cuisine' => 'Vietnamese', 'origin' => 'Vietnam'],
    ['pattern' => '/japan|日本|sushi|ramen|izakaya|ohayou|寿司|ラーメン/i', 'cuisine' => 'Japanese', 'origin' => 'Japan'],
    ['pattern' => '/india|भारत|bhavan|saravanaa|curry/i', 'cuisine' => 'Indian', 'origin' => 'India'],
    ['pattern' => '/uyghur|uighur|taklamakan|xinjiang|新疆/i', 'cuisine' => 'Uyghur', 'origin' => 'China'],
    ['pattern' => '/china|chinese|中国|中餐|nudel|noodle|dumpling|dim sum/i', 'cuisine' => 'Chinese', 'origin' => 'China'],
];

function detectCuisine(string $name): array {
    global $cuisinePatterns;
    foreach ($cuisinePatterns as $p) {
        if (preg_match($p['pattern'], $name)) {
            return ['cuisine' => $p['cuisine'], 'origin' => $p['origin']];
        }
    }
    return ['cuisine' => 'Asian', 'origin' => null];
}

function getJsonBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Routes
try {
    // Health check
    if ($path === '/health' && $method === 'GET') {
        jsonResponse(['status' => 'ok']);
    }

    // Auth routes
    if ($path === '/auth/login' && $method === 'POST') {
        $body = getJsonBody();
        if (($body['password'] ?? '') === ADMIN_PASSWORD) {
            jsonResponse(['token' => createToken()]);
        }
        jsonResponse(['error' => 'Invalid password'], 401);
    }

    if ($path === '/auth/logout' && $method === 'POST') {
        $token = getAuthToken();
        if ($token) removeToken($token);
        jsonResponse(['success' => true]);
    }

    if ($path === '/auth/check' && $method === 'GET') {
        jsonResponse(['authenticated' => isValidToken(getAuthToken())]);
    }

    // Categories
    if ($path === '/categories' && $method === 'GET') {
        $db = getDb();
        $cuisines = $db->query('SELECT DISTINCT cuisine FROM restaurants WHERE cuisine IS NOT NULL ORDER BY cuisine')->fetchAll(PDO::FETCH_COLUMN);
        $origins = $db->query('SELECT DISTINCT origin FROM restaurants WHERE origin IS NOT NULL ORDER BY origin')->fetchAll(PDO::FETCH_COLUMN);
        jsonResponse(['cuisines' => $cuisines, 'origins' => $origins]);
    }

    // Image upload
    if ($path === '/upload' && $method === 'POST') {
        if (!requireAuth()) exit;

        if (!isset($_FILES['image'])) {
            jsonResponse(['error' => 'No image uploaded'], 400);
        }

        $file = $_FILES['image'];
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file['type'], $allowed)) {
            jsonResponse(['error' => 'Invalid file type'], 400);
        }

        if ($file['size'] > 5 * 1024 * 1024) {
            jsonResponse(['error' => 'File too large'], 400);
        }

        $uploadsDir = __DIR__ . '/../uploads';
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0755, true);
        }

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = bin2hex(random_bytes(16)) . '.' . $ext;
        $filepath = $uploadsDir . '/' . $filename;

        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            jsonResponse(['url' => '/uploads/' . $filename]);
        }
        jsonResponse(['error' => 'Upload failed'], 500);
    }

    // Extract from Google Maps
    if ($path === '/extract-gmaps' && $method === 'POST') {
        if (!requireAuth()) exit;

        $body = getJsonBody();
        $url = $body['url'] ?? '';

        if (!$url || strpos($url, 'google.com/maps') === false) {
            jsonResponse(['error' => 'Invalid Google Maps URL'], 400);
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => [
                'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language: en-US,en;q=0.5',
            ],
        ]);
        $html = curl_exec($ch);
        curl_close($ch);

        if (!$html) {
            jsonResponse(['error' => 'Failed to fetch Google Maps'], 500);
        }

        // Extract name from URL
        $name = null;
        if (preg_match('/place\/([^\/]+)/', $url, $m)) {
            $name = urldecode(str_replace('+', ' ', $m[1]));
        }

        // Extract from title
        if (!$name && preg_match('/<title>([^<]+)<\/title>/', $html, $m)) {
            $name = explode(' - ', $m[1])[0];
        }

        // Extract coordinates
        $lat = $lng = null;
        $coordPatterns = [
            '/@(-?\d+\.\d+),(-?\d+\.\d+)/',
            '/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/',
            '/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/',
            '/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/',
        ];
        foreach ($coordPatterns as $pattern) {
            if (preg_match($pattern, $html, $m)) {
                $lat = (float)$m[1];
                $lng = (float)$m[2];
                if ($lat > -90 && $lat < 90 && $lng > -180 && $lng < 180) break;
            }
        }

        // Extract address
        $address = null;
        if (preg_match('/"address":"([^"]+)"/', $html, $m)) {
            $address = preg_replace_callback('/\\\\u([0-9A-Fa-f]{4})/', fn($x) => mb_chr(hexdec($x[1])), $m[1]);
        }

        // Extract image
        $imageUrl = null;
        $localImageUrl = null;
        if (preg_match('/https:\/\/lh[35]\.googleusercontent\.com\/p\/[A-Za-z0-9_-]+/', $html, $m)) {
            $imageUrl = $m[0];

            // Download image
            $imgUrl = strpos($imageUrl, '=') !== false ? $imageUrl : $imageUrl . '=s800-k-no';
            $ch = curl_init($imgUrl);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true]);
            $imgData = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $imgData) {
                $uploadsDir = __DIR__ . '/../uploads';
                if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

                $filename = bin2hex(random_bytes(16)) . '.jpg';
                file_put_contents($uploadsDir . '/' . $filename, $imgData);
                $localImageUrl = '/uploads/' . $filename;
            }
        }

        // Detect cuisine
        $detected = $name ? detectCuisine($name) : ['cuisine' => null, 'origin' => null];

        jsonResponse([
            'name' => $name,
            'address' => $address,
            'lat' => $lat,
            'lng' => $lng,
            'cuisine' => $detected['cuisine'],
            'origin' => $detected['origin'],
            'imageUrl' => $localImageUrl,
            'extracted' => [
                'hasCoordinates' => $lat !== null && $lng !== null,
                'hasAddress' => $address !== null,
                'hasImage' => $localImageUrl !== null,
            ],
        ]);
    }

    // Restaurant routes
    if (preg_match('#^/restaurants(?:/(\d+))?$#', $path, $matches)) {
        $id = $matches[1] ?? null;
        $db = getDb();

        // GET /restaurants - List all
        if ($method === 'GET' && !$id) {
            $sql = 'SELECT * FROM restaurants WHERE 1=1';
            $params = [];

            // Hide hidden restaurants unless admin requests them
            $showHidden = !empty($_GET['includeHidden']) && isValidToken(getAuthToken());
            if (!$showHidden) {
                $sql .= ' AND (hidden IS NULL OR hidden = 0)';
            }

            if (!empty($_GET['cuisine'])) {
                $sql .= ' AND cuisine = ?';
                $params[] = $_GET['cuisine'];
            }
            if (!empty($_GET['origin'])) {
                $sql .= ' AND origin = ?';
                $params[] = $_GET['origin'];
            }
            if (!empty($_GET['search'])) {
                $sql .= ' AND (name LIKE ? OR description LIKE ?)';
                $search = '%' . $_GET['search'] . '%';
                $params[] = $search;
                $params[] = $search;
            }

            $sql .= ' ORDER BY name';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $restaurants = $stmt->fetchAll();

            // Parse images JSON and booleans
            foreach ($restaurants as &$r) {
                $r['images'] = json_decode($r['images'] ?? '[]', true);
                $r['hidden'] = (bool)($r['hidden'] ?? false);
                $r['is_new'] = (bool)($r['is_new'] ?? false);
                $r['is_hot'] = (bool)($r['is_hot'] ?? false);
            }

            jsonResponse($restaurants);
        }

        // GET /restaurants/:id
        if ($method === 'GET' && $id) {
            $stmt = $db->prepare('SELECT * FROM restaurants WHERE id = ?');
            $stmt->execute([$id]);
            $restaurant = $stmt->fetch();

            if (!$restaurant) {
                jsonResponse(['error' => 'Not found'], 404);
            }

            $restaurant['images'] = json_decode($restaurant['images'] ?? '[]', true);
            $restaurant['hidden'] = (bool)($restaurant['hidden'] ?? false);
            $restaurant['is_new'] = (bool)($restaurant['is_new'] ?? false);
            $restaurant['is_hot'] = (bool)($restaurant['is_hot'] ?? false);
            jsonResponse($restaurant);
        }

        // POST /restaurants - Create
        if ($method === 'POST' && !$id) {
            if (!requireAuth()) exit;

            $body = getJsonBody();
            $stmt = $db->prepare('
                INSERT INTO restaurants (name, description, address, lat, lng, cuisine, origin, rating, images, hidden, is_new, is_hot)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $body['name'],
                $body['description'] ?? null,
                $body['address'],
                $body['lat'],
                $body['lng'],
                $body['cuisine'] ?? null,
                $body['origin'] ?? null,
                $body['rating'] ?? null,
                json_encode($body['images'] ?? []),
                $body['hidden'] ?? 0,
                $body['is_new'] ?? 0,
                $body['is_hot'] ?? 0,
            ]);

            $newId = $db->lastInsertId();
            $stmt = $db->prepare('SELECT * FROM restaurants WHERE id = ?');
            $stmt->execute([$newId]);
            $restaurant = $stmt->fetch();
            $restaurant['images'] = json_decode($restaurant['images'] ?? '[]', true);
            $restaurant['hidden'] = (bool)($restaurant['hidden'] ?? false);
            $restaurant['is_new'] = (bool)($restaurant['is_new'] ?? false);
            $restaurant['is_hot'] = (bool)($restaurant['is_hot'] ?? false);

            jsonResponse($restaurant, 201);
        }

        // PUT /restaurants/:id - Update
        if ($method === 'PUT' && $id) {
            if (!requireAuth()) exit;

            $body = getJsonBody();
            $stmt = $db->prepare('
                UPDATE restaurants SET
                    name = ?, description = ?, address = ?, lat = ?, lng = ?,
                    cuisine = ?, origin = ?, rating = ?, images = ?, hidden = ?,
                    is_new = ?, is_hot = ?
                WHERE id = ?
            ');
            $stmt->execute([
                $body['name'],
                $body['description'] ?? null,
                $body['address'],
                $body['lat'],
                $body['lng'],
                $body['cuisine'] ?? null,
                $body['origin'] ?? null,
                $body['rating'] ?? null,
                json_encode($body['images'] ?? []),
                $body['hidden'] ?? 0,
                $body['is_new'] ?? 0,
                $body['is_hot'] ?? 0,
                $id,
            ]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(['error' => 'Not found'], 404);
            }

            $stmt = $db->prepare('SELECT * FROM restaurants WHERE id = ?');
            $stmt->execute([$id]);
            $restaurant = $stmt->fetch();
            $restaurant['images'] = json_decode($restaurant['images'] ?? '[]', true);
            $restaurant['hidden'] = (bool)($restaurant['hidden'] ?? false);
            $restaurant['is_new'] = (bool)($restaurant['is_new'] ?? false);
            $restaurant['is_hot'] = (bool)($restaurant['is_hot'] ?? false);

            jsonResponse($restaurant);
        }

        // PATCH /restaurants/:id - Partial update
        if ($method === 'PATCH' && $id) {
            if (!requireAuth()) exit;

            $body = getJsonBody();
            $updates = [];
            $params = [];

            if (isset($body['hidden'])) {
                $updates[] = 'hidden = ?';
                $params[] = $body['hidden'] ? 1 : 0;
            }
            if (isset($body['is_new'])) {
                $updates[] = 'is_new = ?';
                $params[] = $body['is_new'] ? 1 : 0;
            }
            if (isset($body['is_hot'])) {
                $updates[] = 'is_hot = ?';
                $params[] = $body['is_hot'] ? 1 : 0;
            }

            if (!empty($updates)) {
                $params[] = $id;
                $stmt = $db->prepare('UPDATE restaurants SET ' . implode(', ', $updates) . ' WHERE id = ?');
                $stmt->execute($params);
            }

            $stmt = $db->prepare('SELECT * FROM restaurants WHERE id = ?');
            $stmt->execute([$id]);
            $restaurant = $stmt->fetch();

            if (!$restaurant) {
                jsonResponse(['error' => 'Not found'], 404);
            }

            $restaurant['images'] = json_decode($restaurant['images'] ?? '[]', true);
            $restaurant['hidden'] = (bool)($restaurant['hidden'] ?? false);
            $restaurant['is_new'] = (bool)($restaurant['is_new'] ?? false);
            $restaurant['is_hot'] = (bool)($restaurant['is_hot'] ?? false);
            jsonResponse($restaurant);
        }

        // DELETE /restaurants/:id
        if ($method === 'DELETE' && $id) {
            if (!requireAuth()) exit;

            $stmt = $db->prepare('DELETE FROM restaurants WHERE id = ?');
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(['error' => 'Not found'], 404);
            }

            jsonResponse(['success' => true]);
        }
    }

    // 404
    jsonResponse(['error' => 'Not found'], 404);

} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
}

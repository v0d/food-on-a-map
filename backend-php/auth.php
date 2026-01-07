<?php
/**
 * Authentication for My Asian Munich Admin
 */

define('ADMIN_PASSWORD', getenv('ADMIN_PASSWORD') ?: 'admin123');
define('TOKEN_FILE', __DIR__ . '/data/tokens.json');

function ensureTokenFile(): void {
    $dir = dirname(TOKEN_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    if (!file_exists(TOKEN_FILE)) {
        file_put_contents(TOKEN_FILE, '{}');
    }
}

function getTokens(): array {
    ensureTokenFile();
    $content = file_get_contents(TOKEN_FILE);
    return json_decode($content, true) ?: [];
}

function saveTokens(array $tokens): void {
    ensureTokenFile();
    file_put_contents(TOKEN_FILE, json_encode($tokens));
}

function createToken(): string {
    $token = bin2hex(random_bytes(32));
    $tokens = getTokens();
    $tokens[$token] = time() + (24 * 60 * 60); // 24 hours
    saveTokens($tokens);
    return $token;
}

function removeToken(string $token): void {
    $tokens = getTokens();
    unset($tokens[$token]);
    saveTokens($tokens);
}

function isValidToken(?string $token): bool {
    if (!$token) return false;

    $tokens = getTokens();

    // Clean expired tokens
    $now = time();
    $cleaned = array_filter($tokens, fn($exp) => $exp > $now);
    if (count($cleaned) !== count($tokens)) {
        saveTokens($cleaned);
    }

    return isset($cleaned[$token]) && $cleaned[$token] > $now;
}

function getAuthToken(): ?string {
    // Check multiple places - hosts handle Authorization differently
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    // Some hosts require reading from apache_request_headers
    if (!$header && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    // Also check getallheaders as fallback
    if (!$header && function_exists('getallheaders')) {
        $headers = getallheaders();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (preg_match('/Bearer\s+(.+)/', $header, $matches)) {
        return $matches[1];
    }
    return null;
}

function requireAuth(): bool {
    if (!isValidToken(getAuthToken())) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return false;
    }
    return true;
}

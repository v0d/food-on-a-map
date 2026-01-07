<?php
/**
 * Database connection for My Asian Munich
 */

function getDb(): PDO {
    static $db = null;

    if ($db === null) {
        $dbPath = __DIR__ . '/data/restaurants.db';
        $db = new PDO("sqlite:$dbPath");
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    return $db;
}

function initDb(): void {
    $db = getDb();
    $db->exec("
        CREATE TABLE IF NOT EXISTS restaurants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            address TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            cuisine TEXT,
            origin TEXT,
            rating INTEGER,
            images TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");
}

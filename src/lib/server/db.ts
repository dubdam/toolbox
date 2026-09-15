import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { ensureStorage, STORAGE_ROOT } from './storage';

ensureStorage();

const db = new Database(join(STORAGE_ROOT, 'toolbox.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const migrations = [
	`CREATE TABLE jobs (
		id TEXT PRIMARY KEY,
		tool TEXT NOT NULL,
		status TEXT NOT NULL,
		progress REAL NOT NULL DEFAULT 0,
		message TEXT,
		output_path TEXT,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);
	CREATE INDEX idx_jobs_created ON jobs (created_at DESC);`
];

const userVersion = db.query('PRAGMA user_version').get() as { user_version: number };
let version = userVersion.user_version;
while (version < migrations.length) {
	db.exec(migrations[version]);
	version += 1;
	db.exec(`PRAGMA user_version = ${version}`);
}

export function getDb(): Database {
	return db;
}

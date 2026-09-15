import { ensureStorage } from '$lib/server/storage';
import { getDb } from '$lib/server/db';

ensureStorage();
getDb();

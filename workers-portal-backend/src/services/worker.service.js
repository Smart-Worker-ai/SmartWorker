import { getUserById } from './auth.service.js';
import { getDb } from '../config/database.js';

async function getProfile(userId) {
  const user = await getUserById(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return user;
}

function getEarnings(userId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT total_price, created_at FROM bookings
    WHERE worker_id = ? AND status = 'completed'
  `).all(userId);

  const now = new Date();
  const total = rows.reduce((s, r) => s + (r.total_price ?? 0), 0);
  const thisMonth = rows
    .filter(r => {
      const d = new Date(r.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, r) => s + (r.total_price ?? 0), 0);
  return { total, thisMonth, jobCount: rows.length };
}

function getHistory(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM bookings WHERE worker_id = ? ORDER BY created_at DESC
  `).all(userId);
}

export { getProfile, getEarnings, getHistory };

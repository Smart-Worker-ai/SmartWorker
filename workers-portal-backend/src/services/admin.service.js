import crypto from 'node:crypto';
import { getDb } from '../config/database.js';

// ── Analytics ─────────────────────────────────────────────────────────────────

function getDashboardStats() {
  const db = getDb();
  const totalCustomers  = db.prepare('SELECT COUNT(*) as n FROM customers').get().n;
  const totalWorkers    = db.prepare('SELECT COUNT(*) as n FROM workers').get().n;
  const totalBookings   = db.prepare('SELECT COUNT(*) as n FROM bookings').get().n;
  const completedJobs   = db.prepare("SELECT COUNT(*) as n FROM bookings WHERE status = 'completed'").get().n;
  const totalGrievances = db.prepare('SELECT COUNT(*) as n FROM grievances').get().n;
  const openGrievances  = db.prepare("SELECT COUNT(*) as n FROM grievances WHERE status = 'open'").get().n;

  const hotLocations = db.prepare(`
    SELECT district, COUNT(*) as count FROM bookings
    WHERE status != 'cancelled' GROUP BY district ORDER BY count DESC LIMIT 5
  `).all();

  const topServices = db.prepare(`
    SELECT job_type, COUNT(*) as count FROM bookings
    WHERE status != 'cancelled' GROUP BY job_type ORDER BY count DESC LIMIT 5
  `).all();

  const topCustomers = db.prepare(`
    SELECT c.id, c.name, c.email, c.phone, COUNT(b.id) as bookingCount
    FROM customers c JOIN bookings b ON b.customer_id = c.id
    WHERE b.status != 'cancelled'
    GROUP BY c.id ORDER BY bookingCount DESC LIMIT 10
  `).all();

  const topWorkers = db.prepare(`
    SELECT w.id, w.name, w.job_type, w.district, w.town, w.rating, COUNT(b.id) as bookingCount
    FROM workers w JOIN bookings b ON b.worker_id = w.id
    WHERE b.status != 'cancelled'
    GROUP BY w.id ORDER BY bookingCount DESC LIMIT 10
  `).all();

  return {
    totalCustomers, totalWorkers, totalBookings,
    completedJobs, totalGrievances, openGrievances,
    hotLocations, topServices, topCustomers, topWorkers,
  };
}

// ── Customers ─────────────────────────────────────────────────────────────────

function getAllCustomers() {
  const db = getDb();
  return db.prepare(`
    SELECT id, name, email, phone, role, profile_complete, is_blocked, created_at
    FROM customers ORDER BY created_at DESC
  `).all();
}

function setCustomerBlocked(customerId, blocked) {
  const db = getDb();
  const c = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
  if (!c) throw Object.assign(new Error('Customer not found.'), { statusCode: 404 });
  db.prepare('UPDATE customers SET is_blocked = ? WHERE id = ?').run(blocked ? 1 : 0, customerId);
  db.prepare('UPDATE email_accounts SET is_blocked = ? WHERE id = ?').run(blocked ? 1 : 0, customerId);
  return db.prepare('SELECT id, name, email, phone, is_blocked FROM customers WHERE id = ?').get(customerId);
}

// ── Workers ───────────────────────────────────────────────────────────────────

function getAllWorkers() {
  const db = getDb();
  return db.prepare(`
    SELECT id, name, job_type, daily_rate, district, town, rating, total_reviews,
           experience_years, is_blocked, is_verified, source, created_at
    FROM workers ORDER BY created_at DESC
  `).all();
}

function setWorkerBlocked(workerId, blocked) {
  const db = getDb();
  const w = db.prepare('SELECT id FROM workers WHERE id = ?').get(workerId);
  if (!w) throw Object.assign(new Error('Worker not found.'), { statusCode: 404 });
  db.prepare('UPDATE workers SET is_blocked = ? WHERE id = ?').run(blocked ? 1 : 0, workerId);
  return db.prepare('SELECT id, name, job_type, is_blocked FROM workers WHERE id = ?').get(workerId);
}

function setWorkerVerified(workerId, verified) {
  const db = getDb();
  const w = db.prepare('SELECT id FROM workers WHERE id = ?').get(workerId);
  if (!w) throw Object.assign(new Error('Worker not found.'), { statusCode: 404 });
  db.prepare('UPDATE workers SET is_verified = ? WHERE id = ?').run(verified ? 1 : 0, workerId);
  return db.prepare('SELECT id, name, job_type, is_verified FROM workers WHERE id = ?').get(workerId);
}

function deleteWorker(workerId) {
  const db = getDb();
  const w = db.prepare('SELECT id FROM workers WHERE id = ?').get(workerId);
  if (!w) throw Object.assign(new Error('Worker not found.'), { statusCode: 404 });
  db.prepare('DELETE FROM bookings WHERE worker_id = ?').run(workerId);
  db.prepare('DELETE FROM feedback WHERE worker_id = ?').run(workerId);
  db.prepare('DELETE FROM workers WHERE id = ?').run(workerId);
  return { deleted: workerId };
}

function deleteCustomer(customerId) {
  const db = getDb();
  const c = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
  if (!c) throw Object.assign(new Error('Customer not found.'), { statusCode: 404 });
  db.prepare('DELETE FROM grievances WHERE customer_id = ?').run(customerId);
  db.prepare('DELETE FROM feedback WHERE customer_id = ?').run(customerId);
  db.prepare('DELETE FROM bookings WHERE customer_id = ?').run(customerId);
  db.prepare('DELETE FROM email_accounts WHERE id = ?').run(customerId);
  db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
  return { deleted: customerId };
}

function createWorker({ id, name, jobType, dailyRate, district, town, experienceYears, phone, email, photoUrl }) {
  const db = getDb();
  const workerId = id || crypto.randomUUID();
  const exists = db.prepare('SELECT id FROM workers WHERE id = ?').get(workerId);
  if (exists) {
    // Update email if provided (first sync from portal might not have had it)
    if (email) db.prepare('UPDATE workers SET email = ? WHERE id = ?').run(email, workerId);
    return db.prepare('SELECT * FROM workers WHERE id = ?').get(workerId);
  }
  db.prepare(`
    INSERT INTO workers (id, name, job_type, daily_rate, district, town, experience_years, phone, email, photo_url, is_verified, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'registered')
  `).run(workerId, name, jobType, dailyRate ?? 800, district, town, experienceYears ?? 0, phone ?? null, email ?? null, photoUrl ?? null);
  return db.prepare('SELECT * FROM workers WHERE id = ?').get(workerId);
}

// ── Bookings ──────────────────────────────────────────────────────────────────

function getAllBookings({ status } = {}) {
  const db = getDb();
  if (status) {
    return db.prepare('SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC').all(status);
  }
  return db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
}

// ── Grievances ────────────────────────────────────────────────────────────────

function getAllGrievances({ status } = {}) {
  const db = getDb();
  if (status) {
    return db.prepare('SELECT * FROM grievances WHERE status = ? ORDER BY created_at DESC').all(status);
  }
  return db.prepare('SELECT * FROM grievances ORDER BY created_at DESC').all();
}

function resolveGrievance(grievanceId, { status, adminNote }) {
  const db = getDb();
  const g = db.prepare('SELECT id FROM grievances WHERE id = ?').get(grievanceId);
  if (!g) throw Object.assign(new Error('Grievance not found.'), { statusCode: 404 });
  db.prepare('UPDATE grievances SET status = ?, admin_note = ? WHERE id = ?')
    .run(status ?? 'closed', adminNote ?? null, grievanceId);
  return db.prepare('SELECT * FROM grievances WHERE id = ?').get(grievanceId);
}

export {
  getDashboardStats,
  getAllCustomers, setCustomerBlocked, deleteCustomer,
  getAllWorkers, setWorkerBlocked, setWorkerVerified, createWorker, deleteWorker,
  getAllBookings,
  getAllGrievances, resolveGrievance,
};

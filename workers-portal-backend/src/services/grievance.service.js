import crypto from 'node:crypto';
import { getDb } from '../config/database.js';

function createGrievance({ customerId, workerId, bookingId, subject, description }) {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO grievances (id, customer_id, worker_id, booking_id, subject, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, customerId, workerId ?? null, bookingId ?? null, subject.trim(), description.trim());
  return db.prepare('SELECT * FROM grievances WHERE id = ?').get(id);
}

function getCustomerGrievances(customerId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM grievances WHERE customer_id = ? ORDER BY created_at DESC
  `).all(customerId);
}

function getAllGrievances({ status } = {}) {
  const db = getDb();
  if (status) {
    return db.prepare("SELECT * FROM grievances WHERE status = ? ORDER BY created_at DESC").all(status);
  }
  return db.prepare('SELECT * FROM grievances ORDER BY created_at DESC').all();
}

function updateGrievanceStatus(grievanceId, { status, adminNote }) {
  const db = getDb();
  const g = db.prepare('SELECT id FROM grievances WHERE id = ?').get(grievanceId);
  if (!g) throw Object.assign(new Error('Grievance not found.'), { statusCode: 404 });
  db.prepare('UPDATE grievances SET status = ?, admin_note = ? WHERE id = ?')
    .run(status, adminNote ?? null, grievanceId);
  return db.prepare('SELECT * FROM grievances WHERE id = ?').get(grievanceId);
}

export { createGrievance, getCustomerGrievances, getAllGrievances, updateGrievanceStatus };

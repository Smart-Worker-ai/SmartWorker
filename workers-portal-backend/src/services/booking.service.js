import crypto from 'node:crypto';
import { getDb } from '../config/database.js';
import { sendBookingConfirmation, sendWorkerBookingAlert } from './email.service.js';

const MIN_ADVANCE_HOURS = 24;

// ── Helpers ───────────────────────────────────────────────────────────────────

function assertAdvanceNotice(dateString) {
  const bookingDate = new Date(dateString);
  if (isNaN(bookingDate.getTime())) {
    throw Object.assign(
      new Error('Invalid date format. Use ISO 8601 (e.g. 2026-04-15T09:00:00Z).'),
      { statusCode: 400 }
    );
  }
  const hoursAhead = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursAhead < MIN_ADVANCE_HOURS) {
    throw Object.assign(
      new Error(`Bookings must be made at least ${MIN_ADVANCE_HOURS} hours in advance.`),
      { statusCode: 422 }
    );
  }
}

// ── Workers ───────────────────────────────────────────────────────────────────

function getWorkers({ district, town, jobType } = {}) {
  const db = getDb();
  let sql = `SELECT id, name, job_type, daily_rate, district, town, rating, total_reviews,
                    experience_years, photo_url, is_verified
             FROM workers WHERE is_blocked = 0 AND is_verified = 1`;
  const params = [];
  if (district) { sql += ' AND LOWER(district) = LOWER(?)'; params.push(district); }
  if (town)     { sql += ' AND LOWER(town) = LOWER(?)';     params.push(town); }
  if (jobType)  { sql += ' AND LOWER(job_type) = LOWER(?)'; params.push(jobType); }
  sql += ' ORDER BY rating DESC, total_reviews DESC';

  return db.prepare(sql).all(...params).map(row => ({
    id: row.id,
    name: row.name,
    jobType: row.job_type,
    dailyRate: row.daily_rate,
    district: row.district,
    town: row.town,
    rating: row.rating,
    totalReviews: row.total_reviews,
    experienceYears: row.experience_years,
    photoUrl: row.photo_url ?? null,
    isVerified: !!row.is_verified,
  }));
}

function getWorkerById(workerId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, job_type, daily_rate, district, town, rating, total_reviews,
           experience_years, photo_url, is_verified
    FROM workers WHERE id = ? AND is_blocked = 0
  `).get(workerId);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    jobType: row.job_type,
    dailyRate: row.daily_rate,
    district: row.district,
    town: row.town,
    rating: row.rating,
    totalReviews: row.total_reviews,
    experienceYears: row.experience_years,
    photoUrl: row.photo_url ?? null,
    isVerified: !!row.is_verified,
  };
}

function getWorkerBookedDates(workerId) {
  const db = getDb();
  const activeBookings = db.prepare(`
    SELECT date, number_of_days FROM bookings
    WHERE worker_id = ? AND status NOT IN ('cancelled')
  `).all(workerId);

  const bookedDates = new Set();
  for (const b of activeBookings) {
    const start = new Date(b.date);
    for (let d = 0; d < b.number_of_days; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + d);
      bookedDates.add(day.toISOString().split('T')[0]);
    }
  }
  return [...bookedDates].sort();
}

// ── Bookings ──────────────────────────────────────────────────────────────────

function createBooking({ customerId, workerId, date, numberOfDays, address, notes }) {
  const db = getDb();

  const worker = db.prepare('SELECT * FROM workers WHERE id = ? AND is_blocked = 0').get(workerId);
  if (!worker) throw Object.assign(new Error('Worker not found.'), { statusCode: 404 });

  const days = Number(numberOfDays);
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    throw Object.assign(new Error('numberOfDays must be an integer between 1 and 30.'), { statusCode: 400 });
  }

  assertAdvanceNotice(date);

  // Conflict check across all days of the new booking
  for (let d = 0; d < days; d++) {
    const span = new Date(date);
    span.setDate(span.getDate() + d);
    const dayStr = span.toISOString().split('T')[0];

    const conflict = db.prepare(`
      SELECT b.id FROM bookings b
      WHERE b.worker_id = ? AND b.status NOT IN ('cancelled')
        AND date(b.date) <= date(?)
        AND date(b.date, '+' || (b.number_of_days - 1) || ' days') >= date(?)
    `).get(workerId, dayStr, dayStr);

    if (conflict) {
      throw Object.assign(
        new Error('This worker is already booked on the selected date.'),
        { statusCode: 409 }
      );
    }
  }

  const totalPrice = worker.daily_rate * days;
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO bookings (id, customer_id, worker_id, worker_name, job_type, daily_rate,
      number_of_days, total_price, date, address, notes, district, town, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    id, customerId, workerId, worker.name, worker.job_type, worker.daily_rate,
    days, totalPrice, new Date(date).toISOString(),
    String(address ?? '').trim(), String(notes ?? '').trim(),
    worker.district, worker.town
  );

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);

  // Send email + SMS notifications (fire-and-forget)
  const customer = db.prepare('SELECT email, phone, name FROM customers WHERE id = ?').get(customerId);
  sendBookingConfirmation(
    customer?.email ?? null,
    customer?.phone ?? null,
    booking,
    worker.name
  ).catch(() => {});
  sendWorkerBookingAlert(
    worker.email ?? null,
    worker.phone ?? null,
    worker.name,
    booking,
    customer?.name ?? 'A customer'
  ).catch(() => {});

  return booking;
}

function getCustomerBookings(customerId) {
  const db = getDb();
  return db.prepare(`
    SELECT id, worker_id, worker_name, job_type, daily_rate,
           number_of_days, total_price, date, address, notes,
           district, town, status, created_at
    FROM bookings WHERE customer_id = ? ORDER BY created_at DESC
  `).all(customerId).map(row => ({
    id:           row.id,
    workerId:     row.worker_id,
    workerName:   row.worker_name,
    jobType:      row.job_type,
    dailyRate:    row.daily_rate,
    numberOfDays: row.number_of_days,
    totalPrice:   row.total_price,
    date:         row.date,
    address:      row.address,
    notes:        row.notes,
    district:     row.district,
    town:         row.town,
    status:       row.status,
    createdAt:    row.created_at,
  }));
}

function getBookingById(bookingId) {
  const db = getDb();
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) ?? null;
}

function cancelBooking(bookingId, customerId) {
  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND customer_id = ?').get(bookingId, customerId);
  if (!booking) throw Object.assign(new Error('Booking not found.'), { statusCode: 404 });
  if (booking.status === 'cancelled') throw Object.assign(new Error('Booking is already cancelled.'), { statusCode: 409 });
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(bookingId);
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
}

export { getWorkers, getWorkerById, getWorkerBookedDates, createBooking, getCustomerBookings, getBookingById, cancelBooking };

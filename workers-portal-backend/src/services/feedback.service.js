import crypto from 'node:crypto';
import { getDb } from '../config/database.js';

function submitFeedback({ customerId, workerId, bookingId, rating, comment }) {
  const db = getDb();

  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw Object.assign(new Error('Rating must be an integer between 1 and 5.'), { statusCode: 400 });
  }

  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(workerId);
  if (!worker) throw Object.assign(new Error('Worker not found.'), { statusCode: 404 });

  if (bookingId) {
    const dup = db.prepare(
      'SELECT id FROM feedback WHERE booking_id = ? AND customer_id = ?'
    ).get(bookingId, customerId);
    if (dup) throw Object.assign(new Error('You have already submitted feedback for this booking.'), { statusCode: 409 });
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO feedback (id, customer_id, worker_id, booking_id, rating, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, customerId, workerId, bookingId ?? null, stars, String(comment ?? '').trim());

  // Update worker running average
  const newSum = worker.rating_sum + stars;
  const newCount = worker.total_reviews + 1;
  const newRating = Math.round((newSum / newCount) * 10) / 10;
  db.prepare('UPDATE workers SET rating_sum = ?, total_reviews = ?, rating = ? WHERE id = ?')
    .run(newSum, newCount, newRating, workerId);

  return {
    feedback: db.prepare('SELECT * FROM feedback WHERE id = ?').get(id),
    workerRating: newRating,
    workerTotalReviews: newCount,
  };
}

function getWorkerFeedback(workerId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM feedback WHERE worker_id = ? ORDER BY created_at DESC
  `).all(workerId);
}

export { submitFeedback, getWorkerFeedback };

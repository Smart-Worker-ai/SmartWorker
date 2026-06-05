import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR  = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'smartworkers.db');
fs.mkdirSync(DB_DIR, { recursive: true });

let _db;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _initSchema(_db);
    _seedWorkers(_db);
  }
  return _db;
}

function _initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id                 TEXT PRIMARY KEY,
      firebase_uid       TEXT UNIQUE,
      phone              TEXT UNIQUE,
      email              TEXT UNIQUE,
      name               TEXT,
      avatar_color_index INTEGER DEFAULT 0,
      role               TEXT DEFAULT 'customer',
      profile_complete   INTEGER DEFAULT 0,
      is_blocked         INTEGER DEFAULT 0,
      accepted_terms     INTEGER DEFAULT 0,
      created_at         TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workers (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      job_type         TEXT NOT NULL,
      daily_rate       REAL NOT NULL,
      district         TEXT NOT NULL,
      town             TEXT NOT NULL,
      rating           REAL DEFAULT 0,
      rating_sum       REAL DEFAULT 0,
      total_reviews    INTEGER DEFAULT 0,
      experience_years INTEGER DEFAULT 0,
      phone            TEXT,
      email            TEXT,
      photo_url        TEXT,
      is_blocked       INTEGER DEFAULT 0,
      is_verified      INTEGER DEFAULT 1,
      source           TEXT DEFAULT 'seed',
      created_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id               TEXT PRIMARY KEY,
      customer_id      TEXT NOT NULL REFERENCES customers(id),
      worker_id        TEXT NOT NULL REFERENCES workers(id),
      worker_name      TEXT,
      job_type         TEXT,
      daily_rate       REAL,
      number_of_days   INTEGER,
      total_price      REAL,
      date             TEXT,
      address          TEXT,
      notes            TEXT,
      district         TEXT,
      town             TEXT,
      status           TEXT DEFAULT 'pending',
      created_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id          TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      worker_id   TEXT NOT NULL REFERENCES workers(id),
      booking_id  TEXT REFERENCES bookings(id),
      rating      INTEGER,
      comment     TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grievances (
      id          TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      worker_id   TEXT,
      booking_id  TEXT,
      subject     TEXT NOT NULL,
      description TEXT NOT NULL,
      status      TEXT DEFAULT 'open',
      admin_note  TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_accounts (
      id                 TEXT PRIMARY KEY,
      email              TEXT UNIQUE NOT NULL,
      name               TEXT NOT NULL,
      password_hash      TEXT NOT NULL,
      avatar_color_index INTEGER DEFAULT 0,
      is_blocked         INTEGER DEFAULT 0,
      accepted_terms     INTEGER DEFAULT 0,
      created_at         TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      email    TEXT PRIMARY KEY,
      count    INTEGER DEFAULT 0,
      reset_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS email_otps (
      id         TEXT PRIMARY KEY,
      email      TEXT NOT NULL,
      otp        TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
  `);
}

const SEED_WORKERS = [
  { name: 'Suresh Nair',    jobType: 'Electrician',   dailyRate: 900,  district: 'Ernakulam',          town: 'Kochi',             rating: 4.8, totalReviews: 24, experienceYears: 10 },
  { name: 'Biju Thomas',    jobType: 'Plumber',        dailyRate: 800,  district: 'Ernakulam',          town: 'Kochi',             rating: 4.6, totalReviews: 18, experienceYears:  8 },
  { name: 'Rajan Menon',    jobType: 'Carpenter',      dailyRate: 1000, district: 'Ernakulam',          town: 'Kakkanad',          rating: 4.7, totalReviews: 21, experienceYears: 12 },
  { name: 'Manoj Kumar P',  jobType: 'AC Technician',  dailyRate: 1100, district: 'Ernakulam',          town: 'Edapally',          rating: 4.9, totalReviews: 30, experienceYears: 14 },
  { name: 'Santhosh V',     jobType: 'Painter',        dailyRate: 700,  district: 'Ernakulam',          town: 'Aluva',             rating: 4.2, totalReviews:  9, experienceYears:  5 },
  { name: 'Jithin Raj',     jobType: 'Mason',          dailyRate: 950,  district: 'Ernakulam',          town: 'Angamaly',          rating: 4.4, totalReviews: 13, experienceYears:  7 },
  { name: 'Anoop K',        jobType: 'Electrician',    dailyRate: 850,  district: 'Ernakulam',          town: 'Thrippunithura',    rating: 4.3, totalReviews: 11, experienceYears:  6 },
  { name: 'Deepak Mohan',   jobType: 'Welder',         dailyRate: 1050, district: 'Ernakulam',          town: 'Perumbavoor',       rating: 4.5, totalReviews: 16, experienceYears:  9 },
  { name: 'Sreejith M',     jobType: 'Electrician',    dailyRate: 850,  district: 'Thiruvananthapuram', town: 'Technopark',        rating: 4.7, totalReviews: 22, experienceYears: 11 },
  { name: 'Unnikrishnan V', jobType: 'Plumber',        dailyRate: 750,  district: 'Thiruvananthapuram', town: 'Kazhakkoottam',     rating: 4.5, totalReviews: 15, experienceYears:  8 },
  { name: 'Harikrishnan T', jobType: 'AC Technician',  dailyRate: 1050, district: 'Thiruvananthapuram', town: 'Kesavadasapuram',   rating: 4.6, totalReviews: 19, experienceYears: 10 },
  { name: 'Rajeev L',       jobType: 'Carpenter',      dailyRate: 950,  district: 'Thiruvananthapuram', town: 'Pettah',            rating: 4.3, totalReviews:  8, experienceYears:  6 },
  { name: 'Binil S',        jobType: 'Painter',        dailyRate: 680,  district: 'Thiruvananthapuram', town: 'Vattiyoorkavu',     rating: 4.1, totalReviews:  7, experienceYears:  4 },
  { name: 'Vinod Kumar',    jobType: 'Mason',          dailyRate: 900,  district: 'Thiruvananthapuram', town: 'Nemom',             rating: 4.4, totalReviews: 12, experienceYears:  8 },
  { name: 'Subin K',        jobType: 'Electrician',    dailyRate: 820,  district: 'Thrissur',           town: 'Thrissur Town',     rating: 4.5, totalReviews: 17, experienceYears:  9 },
  { name: 'Pramod T',       jobType: 'Plumber',        dailyRate: 770,  district: 'Thrissur',           town: 'Guruvayur',         rating: 4.3, totalReviews: 10, experienceYears:  6 },
  { name: 'Ajith Menon',    jobType: 'Carpenter',      dailyRate: 980,  district: 'Thrissur',           town: 'Chalakudy',         rating: 4.6, totalReviews: 20, experienceYears: 11 },
  { name: 'Bijeesh P',      jobType: 'AC Technician',  dailyRate: 1080, district: 'Thrissur',           town: 'Irinjalakuda',      rating: 4.4, totalReviews: 14, experienceYears:  8 },
  { name: 'Shijin K',       jobType: 'Electrician',    dailyRate: 800,  district: 'Kozhikode',          town: 'Kozhikode City',    rating: 4.4, totalReviews: 13, experienceYears:  7 },
  { name: 'Noushad P',      jobType: 'Plumber',        dailyRate: 720,  district: 'Kozhikode',          town: 'Vatakara',          rating: 4.2, totalReviews:  8, experienceYears:  5 },
  { name: 'Arun S',         jobType: 'Painter',        dailyRate: 650,  district: 'Kozhikode',          town: 'Ramanattukara',     rating: 4.0, totalReviews:  6, experienceYears:  4 },
  { name: 'Saji John',      jobType: 'Mason',          dailyRate: 920,  district: 'Kozhikode',          town: 'Feroke',            rating: 4.5, totalReviews: 15, experienceYears:  9 },
  { name: 'Tijo P',         jobType: 'Electrician',    dailyRate: 830,  district: 'Kottayam',           town: 'Kottayam Town',     rating: 4.3, totalReviews: 11, experienceYears:  7 },
  { name: 'Jose K',         jobType: 'Carpenter',      dailyRate: 970,  district: 'Kottayam',           town: 'Changanacherry',    rating: 4.7, totalReviews: 18, experienceYears: 10 },
  { name: 'Aneesh M',       jobType: 'Plumber',        dailyRate: 760,  district: 'Kottayam',           town: 'Pala',              rating: 4.4, totalReviews: 12, experienceYears:  7 },
  { name: 'Aravind P',      jobType: 'AC Technician',  dailyRate: 1000, district: 'Palakkad',           town: 'Palakkad Town',     rating: 4.5, totalReviews: 14, experienceYears:  8 },
  { name: 'Pradeep Babu',   jobType: 'Mason',          dailyRate: 880,  district: 'Palakkad',           town: 'Ottapalam',         rating: 4.2, totalReviews:  7, experienceYears:  5 },
  { name: 'Riyas K',        jobType: 'Electrician',    dailyRate: 810,  district: 'Malappuram',         town: 'Manjeri',           rating: 4.3, totalReviews: 10, experienceYears:  6 },
  { name: 'Shafeeq T',      jobType: 'Plumber',        dailyRate: 740,  district: 'Malappuram',         town: 'Tirur',             rating: 4.1, totalReviews:  8, experienceYears:  5 },
  { name: 'Robin Das',      jobType: 'Carpenter',      dailyRate: 930,  district: 'Kollam',             town: 'Chinnakada',        rating: 4.6, totalReviews: 16, experienceYears:  9 },
  { name: 'Manu V',         jobType: 'Painter',        dailyRate: 670,  district: 'Kollam',             town: 'Kadappakada',       rating: 4.0, totalReviews:  5, experienceYears:  3 },
  { name: 'Dipin K',        jobType: 'Electrician',    dailyRate: 800,  district: 'Kannur',             town: 'Kannur Town',       rating: 4.4, totalReviews: 12, experienceYears:  7 },
  { name: 'Vineesh T',      jobType: 'AC Technician',  dailyRate: 1020, district: 'Kannur',             town: 'Thalassery',        rating: 4.5, totalReviews: 13, experienceYears:  8 },
];

function _seedWorkers(db) {
  const count = db.prepare('SELECT COUNT(*) as n FROM workers WHERE source = ?').get('seed');
  if (count.n > 0) return;

  const insert = db.prepare(`
    INSERT INTO workers (id, name, job_type, daily_rate, district, town, rating, rating_sum, total_reviews, experience_years, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed')
  `);

  const insertMany = db.transaction((workers) => {
    for (const w of workers) {
      insert.run(
        crypto.randomUUID(),
        w.name, w.jobType, w.dailyRate,
        w.district, w.town,
        w.rating, w.rating * w.totalReviews, w.totalReviews,
        w.experienceYears
      );
    }
  });
  insertMany(SEED_WORKERS);
}

export { getDb };

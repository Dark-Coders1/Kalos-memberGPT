#!/usr/bin/env node
/**
 * Seed script — populates MongoDB with demo members and body-composition scans.
 * Run with: npm run seed
 *
 * Safe to re-run: clears existing members/scans before inserting.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kalos';

// ── Inline schemas (avoids Next.js module resolution during seeding) ──────────

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['member', 'coach'], default: 'member' },
    goal: { type: String, default: '' },
  },
  { timestamps: true }
);

const scanSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scanDate: { type: Date, required: true, index: true },
    weight: { type: Number, required: true },
    bodyFatPercent: { type: Number, required: true },
    leanMass: { type: Number, required: true },
    fatMass: { type: Number, required: true },
    visceralFat: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    source: { type: String, default: 'manual' },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Scan = mongoose.models.Scan || mongoose.model('Scan', scanSchema);

// ── Demo data ─────────────────────────────────────────────────────────────────

const MEMBERS = [
  {
    name: 'Sarah Lee',
    email: 'sarah.lee@example.com',
    goal: 'Reduce body fat to 20% while preserving lean mass',
    scans: [
      { daysAgo: 120, weight: 68.5, bodyFatPercent: 28.2, leanMass: 49.2, fatMass: 19.3, visceralFat: 9, notes: 'Starting point after holiday break' },
      { daysAgo: 90,  weight: 67.8, bodyFatPercent: 27.1, leanMass: 49.4, fatMass: 18.4, visceralFat: 8, notes: 'Good first month, sleep improved' },
      { daysAgo: 60,  weight: 67.0, bodyFatPercent: 25.8, leanMass: 49.7, fatMass: 17.3, visceralFat: 8, notes: 'Strength gains visible, energy up' },
      { daysAgo: 30,  weight: 65.9, bodyFatPercent: 24.4, leanMass: 49.8, fatMass: 16.1, visceralFat: 7, notes: 'On track — consider adding a fourth training day' },
      { daysAgo: 5,   weight: 65.2, bodyFatPercent: 23.1, leanMass: 50.1, fatMass: 15.1, visceralFat: 7, notes: 'Best scan yet; calorie deficit dialled in' },
    ],
  },
  {
    name: 'Jordan Kim',
    email: 'jordan.kim@example.com',
    goal: 'Build lean mass — targeting 75 kg lean at end of year',
    scans: [
      { daysAgo: 110, weight: 80.2, bodyFatPercent: 18.4, leanMass: 65.4, fatMass: 14.8, visceralFat: 6, notes: 'Off-season bulking phase start' },
      { daysAgo: 80,  weight: 82.1, bodyFatPercent: 19.1, leanMass: 66.5, fatMass: 15.6, visceralFat: 7, notes: 'Added 1.1 kg lean — good' },
      { daysAgo: 50,  weight: 83.5, bodyFatPercent: 20.3, leanMass: 66.5, fatMass: 16.9, visceralFat: 7, notes: 'Fat gaining faster than lean — review surplus' },
      { daysAgo: 20,  weight: 82.8, bodyFatPercent: 19.8, leanMass: 66.3, fatMass: 16.4, visceralFat: 7, notes: 'Lean mass slightly down — watch protein' },
    ],
  },
  {
    name: 'Marcus Webb',
    email: 'marcus.webb@example.com',
    goal: 'General fitness, improve visceral fat score',
    scans: [
      { daysAgo: 150, weight: 95.0, bodyFatPercent: 32.1, leanMass: 64.5, fatMass: 30.5, visceralFat: 14, notes: 'High visceral fat — priority focus' },
      { daysAgo: 110, weight: 93.2, bodyFatPercent: 30.6, leanMass: 64.7, fatMass: 28.5, visceralFat: 13, notes: 'Walking 10k steps daily, making impact' },
      { daysAgo: 70,  weight: 91.5, bodyFatPercent: 29.0, leanMass: 64.9, fatMass: 26.5, visceralFat: 12, notes: 'Great progress, added resistance training' },
      { daysAgo: 35,  weight: 90.0, bodyFatPercent: 27.8, leanMass: 65.0, fatMass: 25.0, visceralFat: 11, notes: 'Down 5 kg, visceral trending well' },
      { daysAgo: 4,   weight: 89.1, bodyFatPercent: 26.9, leanMass: 65.2, fatMass: 23.9, visceralFat: 10, notes: 'Excellent — best in 3 years per his account' },
    ],
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@example.com',
    goal: 'Post-pregnancy: regain strength and lean mass',
    scans: [
      { daysAgo: 90,  weight: 62.0, bodyFatPercent: 31.5, leanMass: 42.5, fatMass: 19.5, visceralFat: 8, notes: 'Return to training after 8-month break' },
      { daysAgo: 55,  weight: 61.2, bodyFatPercent: 30.1, leanMass: 42.8, fatMass: 18.4, visceralFat: 7, notes: 'Lean mass slowly rebuilding' },
      { daysAgo: 20,  weight: 60.5, bodyFatPercent: 28.8, leanMass: 43.1, fatMass: 17.4, visceralFat: 7, notes: 'Consistent — added a second strength session' },
    ],
  },
  {
    name: 'Tom Reeves',
    email: 'tom.reeves@example.com',
    goal: 'Maintenance — stay under 15% body fat year round',
    scans: [
      { daysAgo: 200, weight: 78.4, bodyFatPercent: 14.2, leanMass: 67.3, fatMass: 11.1, visceralFat: 5, notes: 'Solid baseline' },
      { daysAgo: 160, weight: 78.9, bodyFatPercent: 14.8, leanMass: 67.2, fatMass: 11.7, visceralFat: 5, notes: 'Slight uptick, holiday period' },
      { daysAgo: 120, weight: 78.1, bodyFatPercent: 14.0, leanMass: 67.2, fatMass: 10.9, visceralFat: 5, notes: 'Back on track' },
    ],
  },
  {
    name: 'Elena Sousa',
    email: 'elena.sousa@example.com',
    goal: 'Compete in fitness show — reach stage-ready condition',
    scans: [
      { daysAgo: 80, weight: 58.0, bodyFatPercent: 22.1, leanMass: 45.2, fatMass: 12.8, visceralFat: 4, notes: '16-week show prep started' },
      { daysAgo: 50, weight: 56.5, bodyFatPercent: 19.8, leanMass: 45.3, fatMass: 11.2, visceralFat: 4, notes: 'Dropping well, lean mass preserved' },
      { daysAgo: 20, weight: 55.1, bodyFatPercent: 17.2, leanMass: 45.6, fatMass: 9.5,  visceralFat: 3, notes: 'On pace for show — no changes needed' },
    ],
  },
  {
    name: 'Daniel Frost',
    email: 'daniel.frost@example.com',
    goal: 'Lose 10 kg of fat over 6 months',
    scans: [
      { daysAgo: 95,  weight: 102.0, bodyFatPercent: 36.5, leanMass: 64.8, fatMass: 37.2, visceralFat: 16, notes: 'Initial scan — high risk profile' },
      { daysAgo: 65,  weight: 100.1, bodyFatPercent: 35.2, leanMass: 64.9, fatMass: 35.2, visceralFat: 15, notes: 'Good start, 2 kg fat down' },
      { daysAgo: 35,  weight: 99.5,  bodyFatPercent: 35.0, leanMass: 64.7, fatMass: 34.8, visceralFat: 15, notes: 'Plateau — review diet compliance' },
      { daysAgo: 7,   weight: 98.0,  bodyFatPercent: 34.1, leanMass: 64.8, fatMass: 33.2, visceralFat: 14, notes: 'Breakthrough after diet reset — keep going' },
    ],
  },
  {
    name: 'Aisha Grant',
    email: 'aisha.grant@example.com',
    goal: 'Improve athletic performance and reduce injury risk',
    scans: [
      { daysAgo: 130, weight: 71.5, bodyFatPercent: 24.8, leanMass: 53.7, fatMass: 17.8, visceralFat: 7, notes: 'Athlete onboarding' },
      { daysAgo: 75,  weight: 70.8, bodyFatPercent: 23.5, leanMass: 54.2, fatMass: 16.6, visceralFat: 6, notes: 'Power output improved on testing' },
    ],
  },
];

const COACH = {
  name: 'Coach Admin',
  email: 'coach@kalos.app',
  passwordHash: '$2b$10$placeholder_hash_for_seed_only',
  role: 'coach',
};

// ── Seeding logic ─────────────────────────────────────────────────────────────

const daysAgoDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

async function seed() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected: ${MONGODB_URI}`);

  console.log('Clearing existing members and scans…');
  await Scan.deleteMany({});
  await User.deleteMany({ role: 'member' });
  await User.deleteOne({ email: COACH.email });

  console.log('Creating coach account…');
  await User.create(COACH);

  console.log(`Creating ${MEMBERS.length} members with scan history…`);
  for (const def of MEMBERS) {
    const user = await User.create({
      name: def.name,
      email: def.email,
      passwordHash: '$2b$10$placeholder_hash_for_seed_only',
      role: 'member',
      goal: def.goal,
    });

    const scanDocs = def.scans.map((s) => ({
      member: user._id,
      scanDate: daysAgoDate(s.daysAgo),
      weight: s.weight,
      bodyFatPercent: s.bodyFatPercent,
      leanMass: s.leanMass,
      fatMass: s.fatMass,
      visceralFat: s.visceralFat,
      notes: s.notes,
      source: 'seed',
    }));

    await Scan.insertMany(scanDocs);
    console.log(`  ✔ ${user.name} — ${scanDocs.length} scans`);
  }

  console.log('\nSeed complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

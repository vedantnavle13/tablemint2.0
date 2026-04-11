/**
 * seedInteractions.js
 * ───────────────────
 * Generates 1000+ synthetic Interaction documents for testing and
 * bootstrapping the recommendation pipeline.
 *
 * Run once (or whenever you need fresh synthetic data):
 *   node src/scripts/seedInteractions.js
 *
 * The script:
 *   1. Connects to MongoDB via MONGO_URI in .env
 *   2. Fetches real User and Restaurant IDs from the DB
 *   3. Generates realistic interaction records with weighted randomness
 *      (popular restaurants get more hits; heavy users interact more)
 *   4. Bulk-inserts in batches of 200 for performance
 *   5. Disconnects and exits cleanly
 *
 * Safe to re-run — existing interactions are NOT deleted unless you
 * uncomment the CLEAR section below.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Interaction = require('../models/Interaction');

// ─── Config ───────────────────────────────────────────────────────────────────
const TOTAL_RECORDS  = 1200;  // Desired number of synthetic interactions
const BATCH_SIZE     = 200;   // Bulk-insert chunk size
const DAYS_BACK      = 60;    // Spread interactions over the last N days

/** Interaction types with probability weights (must sum to 100) */
const INTERACTION_WEIGHTS = [
  { type: 'view',            weight: 40 },
  { type: 'click_menu',      weight: 20 },
  { type: 'search',          weight: 15 },
  { type: 'add_to_favorite', weight: 10 },
  { type: 'booking_made',    weight: 8  },
  { type: 'order_placed',    weight: 5  },
  { type: 'review_given',    weight: 2  },
];
// Build a cumulative weight array for O(n) weighted random selection
const cumulativeWeights = [];
let cumSum = 0;
for (const entry of INTERACTION_WEIGHTS) {
  cumSum += entry.weight;
  cumulativeWeights.push({ type: entry.type, cumulative: cumSum });
}
const TOTAL_WEIGHT = cumSum; // Should be 100

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pick a random element from an array, optionally biased toward lower indices */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Weighted random between min and max (integer) */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Return a random timestamp within the last DAYS_BACK days */
const randomTimestamp = () =>
  new Date(Date.now() - Math.random() * DAYS_BACK * 24 * 60 * 60 * 1000);

/** Pick a weighted interaction type */
const pickInteractionType = () => {
  const roll = Math.random() * TOTAL_WEIGHT;
  for (const entry of cumulativeWeights) {
    if (roll <= entry.cumulative) return entry.type;
  }
  return cumulativeWeights[cumulativeWeights.length - 1].type;
};

/** Generate a UUID-like session ID */
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

/**
 * Build a single synthetic Interaction document.
 * @param {mongoose.Types.ObjectId[]} userIds
 * @param {mongoose.Types.ObjectId[]} restaurantIds
 * @param {Map<string,string>} sessionMap - reuses sessions within a simulated visit
 */
const buildInteraction = (userIds, restaurantIds, sessionMap) => {
  const userId       = pick(userIds);
  const restaurantId = pick(restaurantIds);
  const type         = pickInteractionType();

  // Reuse or create a session for this user (simulates multiple events per visit)
  const sessionKey = userId.toString();
  if (!sessionMap.has(sessionKey) || Math.random() < 0.3) {
    sessionMap.set(sessionKey, uuid());
  }
  const sessionId = sessionMap.get(sessionKey);

  const doc = {
    user:            userId,
    restaurant:      restaurantId,
    interactionType: type,
    timestamp:       randomTimestamp(),
    sessionId,
  };

  // timeSpent: only for view / click_menu interactions
  if (type === 'view')       doc.timeSpent = randInt(5,  240);
  if (type === 'click_menu') doc.timeSpent = randInt(10, 120);

  // rating: only for review_given
  if (type === 'review_given') {
    // Skew toward positive ratings (real-world bias)
    const skewedRatings = [3, 4, 4, 4, 5, 5, 5, 5];
    doc.rating = pick(skewedRatings);
  }

  return doc;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set in your .env file');
    }

    console.log('🔌 Connecting to MongoDB…');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.\n');

    // Fetch real IDs from existing collections
    const User       = mongoose.model('User',       require('../models/User').schema);
    const Restaurant = mongoose.model('Restaurant', require('../models/Restaurant').schema);

    const userIds       = (await User.find({}, '_id').lean()).map((u) => u._id);
    const restaurantIds = (await Restaurant.find({}, '_id').lean()).map((r) => r._id);

    if (userIds.length === 0)       throw new Error('No users found in DB. Seed users first.');
    if (restaurantIds.length === 0) throw new Error('No restaurants found in DB. Seed restaurants first.');

    console.log(`👤 Found ${userIds.length} users`);
    console.log(`🍽️  Found ${restaurantIds.length} restaurants`);
    console.log(`\n⚙️  Generating ${TOTAL_RECORDS} synthetic interactions…\n`);

    // ── OPTIONAL: clear existing synthetic data ──────────────────────────────
    // Uncomment the two lines below if you want a fresh slate each run.
    // console.log('🗑️  Clearing existing interactions…');
    // await Interaction.deleteMany({});

    // ─── Generate and insert in batches ──────────────────────────────────────
    const sessionMap = new Map(); // userId → current sessionId
    let inserted = 0;

    while (inserted < TOTAL_RECORDS) {
      const batchSize = Math.min(BATCH_SIZE, TOTAL_RECORDS - inserted);
      const batch = Array.from({ length: batchSize }, () =>
        buildInteraction(userIds, restaurantIds, sessionMap)
      );

      await Interaction.insertMany(batch, { ordered: false });
      inserted += batchSize;

      const pct = ((inserted / TOTAL_RECORDS) * 100).toFixed(0);
      process.stdout.write(`\r   Progress: ${inserted}/${TOTAL_RECORDS} (${pct}%)`);
    }

    console.log(`\n\n✅ Done! Inserted ${inserted} interaction records.`);

    // ─── Print a summary breakdown ────────────────────────────────────────────
    const summary = await Interaction.aggregate([
      { $group: { _id: '$interactionType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    console.log('\n📊 Interaction type breakdown:');
    summary.forEach(({ _id, count }) =>
      console.log(`   ${_id.padEnd(20)} ${count}`)
    );
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB. Bye!');
  }
})();

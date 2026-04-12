/**
 * dropOldReviewIndex.js
 * Run once to drop the stale customer_1_restaurant_1 unique index
 * that was preventing customers from reviewing more than once per restaurant.
 * 
 * Usage:  node src/scripts/dropOldReviewIndex.js
 */
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error('❌  No MONGO_URI found in .env');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB');

    const db   = mongoose.connection.db;
    const coll = db.collection('reviews');

    // List current indexes so we can confirm the bad one exists
    const indexes = await coll.indexes();
    console.log('\nCurrent indexes on reviews:');
    indexes.forEach(idx => console.log(' ', idx.name, '->', JSON.stringify(idx.key)));

    const staleIndex = indexes.find(idx => idx.name === 'customer_1_restaurant_1');

    if (!staleIndex) {
      console.log('\n✅  Stale index customer_1_restaurant_1 not found — nothing to do.');
    } else {
      await coll.dropIndex('customer_1_restaurant_1');
      console.log('\n✅  Dropped stale index: customer_1_restaurant_1');
      console.log('   Customers can now leave multiple reviews (one per completed booking).');
    }

  } catch (err) {
    console.error('❌  Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  }
})();

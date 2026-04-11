/**
 * profileCompletion.js
 * ────────────────────
 * Utility for calculating a user's profile completion percentage.
 *
 * Design decisions:
 *   ─ Fields are weighted by their importance to recommendation quality.
 *   ─ The total weight always sums to 100 so the result is a clean percentage.
 *   ─ The function is pure (no DB calls) — call it anywhere and pass the result
 *     to `user.profileCompletedPercentage` before saving.
 *   ─ `completedProfileSteps` is derived here so it's always in sync.
 */

/**
 * Weight table — each entry maps a field name to:
 *   { weight: Number, check: (user) => Boolean }
 *
 * Total weights MUST sum to 100.
 *
 * Rationale:
 *   • preferredCuisines  (25) — primary signal for content-based filtering
 *   • dietaryPreferences (20) — essential for filtering irrelevant results
 *   • city               (20) — critical for geo-aware recommendations
 *   • preferredPriceRange(15) — strong filter for budget-aware ranking
 *   • location           (10) — precise coords improve distance ranking
 *   • avatar             ( 5) — social proof; minor signal
 *   • phone              ( 5) — completeness; minor signal
 */
const PROFILE_WEIGHTS = [
  {
    field: 'preferredCuisines',
    weight: 25,
    /** Must have at least one cuisine selected */
    check: (user) => Array.isArray(user.preferredCuisines) && user.preferredCuisines.length > 0,
  },
  {
    field: 'dietaryPreferences',
    weight: 20,
    /** Must have at least one dietary preference */
    check: (user) =>
      Array.isArray(user.dietaryPreferences) && user.dietaryPreferences.length > 0,
  },
  {
    field: 'city',
    weight: 20,
    /** City must be a non-empty string */
    check: (user) => typeof user.city === 'string' && user.city.trim().length > 0,
  },
  {
    field: 'preferredPriceRange',
    weight: 15,
    /** Must have selected a price range */
    check: (user) =>
      typeof user.preferredPriceRange === 'string' && user.preferredPriceRange.length > 0,
  },
  {
    field: 'location',
    weight: 10,
    /** Must have valid lat + lng coordinates */
    check: (user) =>
      user.location &&
      typeof user.location.lat === 'number' &&
      typeof user.location.lng === 'number' &&
      !isNaN(user.location.lat) &&
      !isNaN(user.location.lng),
  },
  {
    field: 'avatar',
    weight: 5,
    /** Profile photo must be set */
    check: (user) => typeof user.avatar === 'string' && user.avatar.trim().length > 0,
  },
  {
    field: 'phone',
    weight: 5,
    /** Phone number must be set */
    check: (user) => typeof user.phone === 'string' && user.phone.trim().length > 0,
  },
];

// Sanity check at module load time — catches misconfiguration immediately.
const _totalWeight = PROFILE_WEIGHTS.reduce((sum, e) => sum + e.weight, 0);
if (_totalWeight !== 100) {
  throw new Error(
    `[profileCompletion] PROFILE_WEIGHTS must sum to 100 but got ${_totalWeight}. Fix the weight table.`
  );
}

/**
 * calculateProfileCompletion(user)
 * ──────────────────────────────────
 * Returns `{ percentage, completedSteps, missingSteps }`.
 *
 * Call this whenever the user updates their profile and persist the result:
 *
 *   const { percentage, completedSteps } = calculateProfileCompletion(user);
 *   user.profileCompletedPercentage = percentage;
 *   user.completedProfileSteps      = completedSteps;
 *   await user.save();
 *
 * @param {Object} user  - Mongoose User document (or plain object with same shape)
 * @returns {{ percentage: number, completedSteps: string[], missingSteps: string[] }}
 */
const calculateProfileCompletion = (user) => {
  if (!user) throw new TypeError('[calculateProfileCompletion] user argument is required');

  let earned = 0;
  const completedSteps = [];
  const missingSteps = [];

  for (const entry of PROFILE_WEIGHTS) {
    if (entry.check(user)) {
      earned += entry.weight;
      completedSteps.push(entry.field);
    } else {
      missingSteps.push(entry.field);
    }
  }

  // Clamp to [0, 100] for safety; should always be exact given the weight table.
  const percentage = Math.min(100, Math.max(0, earned));

  return { percentage, completedSteps, missingSteps };
};

module.exports = {
  calculateProfileCompletion,
  /** Expose the weight table so tests and the frontend can introspect it */
  PROFILE_WEIGHTS,
};

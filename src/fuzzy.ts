/**
 * Fuzzy scoring for PathFuzzy Finder.
 *
 * Scores a candidate string against a query string using a character-matching
 * approach that rewards:
 *   - Contiguous runs of matched characters
 *   - Matches at path-segment boundaries (after '/' or '.')
 *   - Matches at the start of the candidate
 *   - Shorter candidates (when scores are otherwise equal)
 *
 * Returns null if the query cannot be matched in the candidate at all.
 */
export interface FuzzyMatch {
  score: number;
  /** Indices in the candidate string that were matched */
  positions: number[];
}

const SCORE_MATCH = 16;
const SCORE_CONTIGUOUS_BONUS = 8;
const SCORE_SEGMENT_START_BONUS = 12;
const SCORE_START_BONUS = 16;
const SCORE_CAMEL_BONUS = 8;
const PENALTY_UNMATCHED_LEAD = -3;
const PENALTY_LENGTH = -0.5;

/**
 * Returns a FuzzyMatch (with score and match positions) if the query
 * fuzzy-matches the candidate, or null if it does not match.
 */
export function fuzzyMatch(candidate: string, query: string): FuzzyMatch | null {
  if (query.length === 0) {
    return { score: 0, positions: [] };
  }

  const lowerCandidate = candidate.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Fast path: check if all query chars exist in order
  if (!hasAllCharsInOrder(lowerCandidate, lowerQuery)) {
    return null;
  }

  // Use dynamic programming to find the best match positions
  return computeBestMatch(candidate, lowerCandidate, lowerQuery);
}

function hasAllCharsInOrder(candidate: string, query: string): boolean {
  let qi = 0;
  for (let ci = 0; ci < candidate.length && qi < query.length; ci++) {
    if (candidate[ci] === query[qi]) {
      qi++;
    }
  }
  return qi === query.length;
}

/**
 * DP-based best match finder. Finds match positions that maximise the score.
 *
 * We use a standard "fuzzy" DP:
 *   dp[qi][ci] = best score matching query[0..qi] ending at candidate[ci]
 */
function computeBestMatch(
  candidate: string,
  lowerCandidate: string,
  lowerQuery: string
): FuzzyMatch | null {
  const n = candidate.length;
  const m = lowerQuery.length;

  if (m > n) {
    return null;
  }

  const NEG_INF = Number.NEGATIVE_INFINITY;

  // Bonuses that depend only on candidate position, regardless of query index.
  const perCharBonus = new Array<number>(n).fill(0);
  for (let ci = 0; ci < n; ci++) {
    let bonus = 0;
    if (isSegmentStart(candidate, ci)) {
      bonus += SCORE_SEGMENT_START_BONUS;
    }
    if (ci > 0 && isUpperCase(candidate[ci]) && !isUpperCase(candidate[ci - 1])) {
      bonus += SCORE_CAMEL_BONUS;
    }
    perCharBonus[ci] = bonus;
  }

  // prevScores[ci] = best score for matching query[0..qi] ending at candidate[ci]
  let prevScores = new Array<number>(n).fill(NEG_INF);

  // prevIdxLevels[qi][ci] = predecessor candidate index for query char qi at ci
  const prevIdxLevels: Int32Array[] = new Array(m);
  const level0Prev = new Int32Array(n);
  level0Prev.fill(-1);
  prevIdxLevels[0] = level0Prev;

  // Initialize: match query[0] against each candidate position
  let unmatchedLead = 0;
  for (let ci = 0; ci < n; ci++) {
    if (lowerCandidate[ci] !== lowerQuery[0]) {
      unmatchedLead++;
      continue;
    }
    let score = SCORE_MATCH;
    score += unmatchedLead * PENALTY_UNMATCHED_LEAD;
    if (ci === 0) {
      score += SCORE_START_BONUS;
    }
    score += perCharBonus[ci];
    prevScores[ci] = score;
    unmatchedLead = 0;
  }

  // Fill in for remaining query characters
  for (let qi = 1; qi < m; qi++) {
    const currScores = new Array<number>(n).fill(NEG_INF);
    const currPrevIdx = new Int32Array(n);
    currPrevIdx.fill(-1);

    // Best predecessor for each ci can be tracked incrementally.
    let bestPrevScore = NEG_INF;
    let bestPrevIdx = -1;
    const minPrevIdx = qi - 1;

    for (let ci = qi; ci < n; ci++) {
      const pi = ci - 1;
      if (pi >= minPrevIdx && prevScores[pi] > bestPrevScore) {
        bestPrevScore = prevScores[pi];
        bestPrevIdx = pi;
      }

      if (lowerCandidate[ci] !== lowerQuery[qi] || bestPrevScore === NEG_INF) {
        continue;
      }

      let score = bestPrevScore + SCORE_MATCH;
      if (bestPrevIdx === ci - 1) {
        score += SCORE_CONTIGUOUS_BONUS;
      }
      score += perCharBonus[ci];

      currScores[ci] = score;
      currPrevIdx[ci] = bestPrevIdx;
    }

    prevScores = currScores;
    prevIdxLevels[qi] = currPrevIdx;
  }

  // Find best final position
  let bestScore = NEG_INF;
  let bestEndIdx = -1;
  for (let ci = 0; ci < n; ci++) {
    if (prevScores[ci] > bestScore) {
      bestScore = prevScores[ci];
      bestEndIdx = ci;
    }
  }

  if (bestEndIdx === -1 || bestScore === NEG_INF) {
    return null;
  }

  // Reconstruct positions
  const positions = new Array<number>(m);
  let idx = bestEndIdx;
  for (let qi = m - 1; qi >= 0; qi--) {
    positions[qi] = idx;
    idx = prevIdxLevels[qi][idx];
  }

  return { score: bestScore + n * PENALTY_LENGTH, positions };
}

function isSegmentStart(candidate: string, ci: number): boolean {
  if (ci === 0) { return true; }
  const prev = candidate[ci - 1];
  return prev === '/' || prev === '\\' || prev === '.' || prev === '-' || prev === '_';
}

function isUpperCase(ch: string): boolean {
  return ch >= 'A' && ch <= 'Z';
}

/**
 * Score a file path against a query, using both the full relative path and
 * the filename component. Returns null if no match.
 */
export function scoreFile(relativePath: string, filename: string, query: string): FuzzyMatch | null {
  if (query.length === 0) {
    return { score: 0, positions: [] };
  }

  // Score against full path (normalized to forward slashes)
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const pathMatch = fuzzyMatch(normalizedPath, query);

  // Score against filename only — boost filename matches
  const fileMatch = fuzzyMatch(filename, query);

  if (!pathMatch && !fileMatch) {
    return null;
  }

  if (!pathMatch) {
    return fileMatch;
  }

  if (!fileMatch) {
    return pathMatch;
  }

  // Prefer the higher score; filename match gets a bonus for being concise
  const fileScore = fileMatch.score + 10;
  if (fileScore > pathMatch.score) {
    return { score: fileScore, positions: fileMatch.positions };
  }
  return pathMatch;
}

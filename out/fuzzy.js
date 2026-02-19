"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fuzzyMatch = fuzzyMatch;
exports.scoreFile = scoreFile;
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
function fuzzyMatch(candidate, query) {
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
function hasAllCharsInOrder(candidate, query) {
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
function computeBestMatch(candidate, lowerCandidate, lowerQuery) {
    const n = candidate.length;
    const m = lowerQuery.length;
    // For each query character, compute best scores
    let prev = new Array(n).fill(null).map(() => ({ score: -Infinity, prevIdx: -1 }));
    let curr = new Array(n).fill(null).map(() => ({ score: -Infinity, prevIdx: -1 }));
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
        if (isSegmentStart(candidate, ci)) {
            score += SCORE_SEGMENT_START_BONUS;
        }
        if (ci > 0 && isUpperCase(candidate[ci]) && !isUpperCase(candidate[ci - 1])) {
            score += SCORE_CAMEL_BONUS;
        }
        prev[ci] = { score, prevIdx: -1 };
        unmatchedLead = 0;
    }
    // Fill in for remaining query characters
    for (let qi = 1; qi < m; qi++) {
        curr = new Array(n).fill(null).map(() => ({ score: -Infinity, prevIdx: -1 }));
        for (let ci = qi; ci < n; ci++) {
            if (lowerCandidate[ci] !== lowerQuery[qi]) {
                continue;
            }
            // Find best predecessor in prev[0..ci-1]
            let bestPrevScore = -Infinity;
            let bestPrevIdx = -1;
            for (let pi = qi - 1; pi < ci; pi++) {
                if (prev[pi].score > bestPrevScore) {
                    bestPrevScore = prev[pi].score;
                    bestPrevIdx = pi;
                }
            }
            if (bestPrevScore === -Infinity) {
                continue;
            }
            let score = bestPrevScore + SCORE_MATCH;
            // Contiguous bonus
            if (bestPrevIdx === ci - 1) {
                score += SCORE_CONTIGUOUS_BONUS;
            }
            // Segment start bonus
            if (isSegmentStart(candidate, ci)) {
                score += SCORE_SEGMENT_START_BONUS;
            }
            // CamelCase bonus
            if (ci > 0 && isUpperCase(candidate[ci]) && !isUpperCase(candidate[ci - 1])) {
                score += SCORE_CAMEL_BONUS;
            }
            curr[ci] = { score, prevIdx: bestPrevIdx };
        }
        prev = curr;
    }
    // Find best final position
    let bestScore = -Infinity;
    let bestEndIdx = -1;
    for (let ci = 0; ci < n; ci++) {
        if (prev[ci].score > bestScore) {
            bestScore = prev[ci].score;
            bestEndIdx = ci;
        }
    }
    if (bestEndIdx === -1 || bestScore === -Infinity) {
        return null;
    }
    // Apply length penalty
    bestScore += n * PENALTY_LENGTH;
    // Reconstruct positions
    const positions = [];
    let idx = bestEndIdx;
    let level = curr; // points to the last filled 'prev' after the loop
    // Re-run DP keeping all levels to reconstruct path
    // Simpler: re-run forward reconstruction
    const allLevels = [];
    {
        const l0 = new Array(n).fill(null).map(() => ({ score: -Infinity, prevIdx: -1 }));
        let ul = 0;
        for (let ci = 0; ci < n; ci++) {
            if (lowerCandidate[ci] !== lowerQuery[0]) {
                ul++;
                continue;
            }
            let s = SCORE_MATCH + ul * PENALTY_UNMATCHED_LEAD;
            if (ci === 0) {
                s += SCORE_START_BONUS;
            }
            if (isSegmentStart(candidate, ci)) {
                s += SCORE_SEGMENT_START_BONUS;
            }
            if (ci > 0 && isUpperCase(candidate[ci]) && !isUpperCase(candidate[ci - 1])) {
                s += SCORE_CAMEL_BONUS;
            }
            l0[ci] = { score: s, prevIdx: -1 };
            ul = 0;
        }
        allLevels.push(l0);
    }
    for (let qi = 1; qi < m; qi++) {
        const lqi = new Array(n).fill(null).map(() => ({ score: -Infinity, prevIdx: -1 }));
        const prevLevel = allLevels[qi - 1];
        for (let ci = qi; ci < n; ci++) {
            if (lowerCandidate[ci] !== lowerQuery[qi]) {
                continue;
            }
            let bestPS = -Infinity;
            let bestPI = -1;
            for (let pi = qi - 1; pi < ci; pi++) {
                if (prevLevel[pi].score > bestPS) {
                    bestPS = prevLevel[pi].score;
                    bestPI = pi;
                }
            }
            if (bestPS === -Infinity) {
                continue;
            }
            let s = bestPS + SCORE_MATCH;
            if (bestPI === ci - 1) {
                s += SCORE_CONTIGUOUS_BONUS;
            }
            if (isSegmentStart(candidate, ci)) {
                s += SCORE_SEGMENT_START_BONUS;
            }
            if (ci > 0 && isUpperCase(candidate[ci]) && !isUpperCase(candidate[ci - 1])) {
                s += SCORE_CAMEL_BONUS;
            }
            lqi[ci] = { score: s, prevIdx: bestPI };
        }
        allLevels.push(lqi);
    }
    // Reconstruct from last level
    idx = -1;
    bestScore = -Infinity;
    const lastLevel = allLevels[m - 1];
    for (let ci = 0; ci < n; ci++) {
        if (lastLevel[ci].score > bestScore) {
            bestScore = lastLevel[ci].score;
            idx = ci;
        }
    }
    if (idx === -1) {
        return null;
    }
    bestScore += n * PENALTY_LENGTH;
    for (let qi = m - 1; qi >= 0; qi--) {
        positions.unshift(idx);
        idx = allLevels[qi][idx].prevIdx;
    }
    return { score: bestScore, positions };
}
function isSegmentStart(candidate, ci) {
    if (ci === 0) {
        return true;
    }
    const prev = candidate[ci - 1];
    return prev === '/' || prev === '\\' || prev === '.' || prev === '-' || prev === '_';
}
function isUpperCase(ch) {
    return ch >= 'A' && ch <= 'Z';
}
/**
 * Score a file path against a query, using both the full relative path and
 * the filename component. Returns null if no match.
 */
function scoreFile(relativePath, filename, query) {
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
//# sourceMappingURL=fuzzy.js.map
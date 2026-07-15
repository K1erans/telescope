"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fuzzyMatch = fuzzyMatch;
exports.scoreFile = scoreFile;
exports.createFileScorer = createFileScorer;
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
/**
 * Returns only the best fuzzy score. This follows the same scoring rules as
 * fuzzyMatch but avoids allocating predecessor arrays and match positions.
 */
function fuzzyScore(candidate, lowerCandidate, lowerQuery, workspace) {
    if (lowerQuery.length === 0) {
        return 0;
    }
    if (!hasAllCharsInOrder(lowerCandidate, lowerQuery)) {
        return null;
    }
    const n = candidate.length;
    const m = lowerQuery.length;
    if (m > n) {
        return null;
    }
    const negativeInfinity = Number.NEGATIVE_INFINITY;
    const buffers = workspace
        ? workspace.buffers(n)
        : [new Float64Array(n), new Float64Array(n)];
    let previousScores = buffers[0];
    let currentScores = buffers[1];
    previousScores.fill(negativeInfinity, 0, n);
    let unmatchedLead = 0;
    for (let candidateIndex = 0; candidateIndex < n; candidateIndex++) {
        if (lowerCandidate[candidateIndex] !== lowerQuery[0]) {
            unmatchedLead++;
            continue;
        }
        let score = SCORE_MATCH + unmatchedLead * PENALTY_UNMATCHED_LEAD;
        if (candidateIndex === 0) {
            score += SCORE_START_BONUS;
        }
        score += characterBonus(candidate, candidateIndex);
        previousScores[candidateIndex] = score;
        unmatchedLead = 0;
    }
    for (let queryIndex = 1; queryIndex < m; queryIndex++) {
        currentScores.fill(negativeInfinity, 0, n);
        let bestPreviousScore = negativeInfinity;
        let bestPreviousIndex = -1;
        for (let candidateIndex = queryIndex; candidateIndex < n; candidateIndex++) {
            const previousIndex = candidateIndex - 1;
            if (previousIndex >= queryIndex - 1
                && previousScores[previousIndex] > bestPreviousScore) {
                bestPreviousScore = previousScores[previousIndex];
                bestPreviousIndex = previousIndex;
            }
            if (lowerCandidate[candidateIndex] !== lowerQuery[queryIndex]
                || bestPreviousScore === negativeInfinity) {
                continue;
            }
            let score = bestPreviousScore + SCORE_MATCH;
            if (bestPreviousIndex === candidateIndex - 1) {
                score += SCORE_CONTIGUOUS_BONUS;
            }
            score += characterBonus(candidate, candidateIndex);
            currentScores[candidateIndex] = score;
        }
        [previousScores, currentScores] = [currentScores, previousScores];
    }
    let bestScore = negativeInfinity;
    for (const score of previousScores) {
        if (score > bestScore) {
            bestScore = score;
        }
    }
    return bestScore === negativeInfinity ? null : bestScore + n * PENALTY_LENGTH;
}
class ScoreWorkspace {
    first = new Float64Array(0);
    second = new Float64Array(0);
    buffers(length) {
        if (this.first.length < length) {
            this.first = new Float64Array(length);
            this.second = new Float64Array(length);
        }
        return [this.first, this.second];
    }
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
    if (m > n) {
        return null;
    }
    const NEG_INF = Number.NEGATIVE_INFINITY;
    // Bonuses that depend only on candidate position, regardless of query index.
    const perCharBonus = new Array(n).fill(0);
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
    let prevScores = new Array(n).fill(NEG_INF);
    // prevIdxLevels[qi][ci] = predecessor candidate index for query char qi at ci
    const prevIdxLevels = new Array(m);
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
        const currScores = new Array(n).fill(NEG_INF);
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
    const positions = new Array(m);
    let idx = bestEndIdx;
    for (let qi = m - 1; qi >= 0; qi--) {
        positions[qi] = idx;
        idx = prevIdxLevels[qi][idx];
    }
    return { score: bestScore + n * PENALTY_LENGTH, positions };
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
function characterBonus(candidate, index) {
    let bonus = 0;
    if (isSegmentStart(candidate, index)) {
        bonus += SCORE_SEGMENT_START_BONUS;
    }
    if (index > 0 && isUpperCase(candidate[index]) && !isUpperCase(candidate[index - 1])) {
        bonus += SCORE_CAMEL_BONUS;
    }
    return bonus;
}
/**
 * Score a file path against a query, using both the full relative path and
 * the filename component. Returns null if no match.
 */
function scoreFile(relativePath, filename, query, lowerQuery = query.toLowerCase(), indexedLowerPath, indexedLowerFilename) {
    return scoreFileWithWorkspace(relativePath, filename, query, lowerQuery, indexedLowerPath, indexedLowerFilename);
}
function createFileScorer(query) {
    const lowerQuery = query.toLowerCase();
    const workspace = new ScoreWorkspace();
    return (relativePath, lowerRelativePath, filename, lowerFilename) => scoreFileWithWorkspace(relativePath, filename, query, lowerQuery, lowerRelativePath, lowerFilename, workspace);
}
function scoreFileWithWorkspace(relativePath, filename, query, lowerQuery, indexedLowerPath, indexedLowerFilename, workspace) {
    if (query.length === 0) {
        return 0;
    }
    // Inventory paths are already normalized. Keep direct callers compatible.
    const normalizedPath = relativePath.includes('\\')
        ? relativePath.replace(/\\/g, '/')
        : relativePath;
    const pathScore = fuzzyScore(normalizedPath, indexedLowerPath ?? normalizedPath.toLowerCase(), lowerQuery, workspace);
    // Score against filename only — boost filename matches
    const fileScore = fuzzyScore(filename, indexedLowerFilename ?? filename.toLowerCase(), lowerQuery, workspace);
    if (pathScore === null && fileScore === null) {
        return null;
    }
    if (pathScore === null) {
        return fileScore;
    }
    if (fileScore === null) {
        return pathScore;
    }
    // Prefer the higher score; filename match gets a bonus for being concise
    return Math.max(pathScore, fileScore + 10);
}
//# sourceMappingURL=fuzzy.js.map
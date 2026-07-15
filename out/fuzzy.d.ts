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
/**
 * Returns a FuzzyMatch (with score and match positions) if the query
 * fuzzy-matches the candidate, or null if it does not match.
 */
export declare function fuzzyMatch(candidate: string, query: string): FuzzyMatch | null;
/**
 * Score a file path against a query, using both the full relative path and
 * the filename component. Returns null if no match.
 */
export declare function scoreFile(relativePath: string, filename: string, query: string, lowerQuery?: string, indexedLowerPath?: string, indexedLowerFilename?: string): number | null;
export type FileScorer = (relativePath: string, lowerRelativePath: string, filename: string, lowerFilename: string) => number | null;
export declare function createFileScorer(query: string): FileScorer;
//# sourceMappingURL=fuzzy.d.ts.map
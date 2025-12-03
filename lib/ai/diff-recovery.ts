/**
 * Diff Recovery System
 * 
 * Advanced strategies for recovering from failed diff applications.
 * Uses multiple techniques to find and apply edits when exact matching fails.
 */

import type { DiffBlock, DiffResult } from './diff';

export interface RecoveryStrategy {
    name: string;
    description: string;
    apply: (content: string, block: DiffBlock) => RecoveryResult | null;
}

export interface RecoveryResult {
    success: boolean;
    content: string;
    strategy: string;
    confidence: number; // 0-1, how confident we are in the match
    matchInfo?: {
        originalLine?: number;
        matchedLine?: number;
        similarity?: number;
    };
}

export interface EnhancedDiffResult extends DiffResult {
    recoveryUsed: boolean;
    strategiesAttempted: string[];
    warnings: string[];
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    if (m === 0) return n;
    if (n === 0) return m;
    
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }
    
    return dp[m][n];
}

/**
 * Calculate similarity between two strings (0-1)
 */
function stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const maxLen = Math.max(str1.length, str2.length);
    const distance = levenshteinDistance(str1, str2);
    return 1 - distance / maxLen;
}

/**
 * Normalize whitespace for comparison
 */
function normalizeWhitespace(text: string): string {
    return text.split('\n').map(line => line.trim()).join('\n');
}

/**
 * Extract unique tokens from code
 */
function extractTokens(code: string): Set<string> {
    const tokens = new Set<string>();
    const matches = code.match(/\b\w+\b/g) || [];
    for (const match of matches) {
        if (match.length > 2) tokens.add(match);
    }
    return tokens;
}

/**
 * Calculate token overlap between two code snippets
 */
function tokenOverlap(code1: string, code2: string): number {
    const tokens1 = extractTokens(code1);
    const tokens2 = extractTokens(code2);
    
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    let overlap = 0;
    for (const token of tokens1) {
        if (tokens2.has(token)) overlap++;
    }
    
    return overlap / Math.max(tokens1.size, tokens2.size);
}

/**
 * Strategy 1: Whitespace-normalized matching
 */
const whitespaceNormalizedStrategy: RecoveryStrategy = {
    name: 'whitespace-normalized',
    description: 'Match ignoring whitespace differences',
    apply: (content: string, block: DiffBlock): RecoveryResult | null => {
        const normalizedSearch = normalizeWhitespace(block.search);
        const normalizedContent = normalizeWhitespace(content);
        
        if (!normalizedContent.includes(normalizedSearch)) {
            return null;
        }
        
        // Find the actual position in original content
        const searchLines = block.search.split('\n').map(l => l.trim());
        const contentLines = content.split('\n');
        
        for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
            let matches = true;
            for (let j = 0; j < searchLines.length; j++) {
                if (contentLines[i + j].trim() !== searchLines[j]) {
                    matches = false;
                    break;
                }
            }
            
            if (matches) {
                // Found match, replace preserving original indentation
                const replaceLines = block.replace.split('\n');
                const originalIndent = contentLines[i].match(/^(\s*)/)?.[1] || '';
                
                const indentedReplace = replaceLines.map((line, idx) => {
                    if (idx === 0) return originalIndent + line.trim();
                    if (line.trim() === '') return '';
                    return originalIndent + line.trimStart();
                });
                
                const newLines = [
                    ...contentLines.slice(0, i),
                    ...indentedReplace,
                    ...contentLines.slice(i + searchLines.length),
                ];
                
                return {
                    success: true,
                    content: newLines.join('\n'),
                    strategy: 'whitespace-normalized',
                    confidence: 0.9,
                    matchInfo: { originalLine: i + 1 },
                };
            }
        }
        
        return null;
    },
};

/**
 * Strategy 2: Line-by-line fuzzy matching
 */
const fuzzyLineMatchStrategy: RecoveryStrategy = {
    name: 'fuzzy-line-match',
    description: 'Match lines with high similarity',
    apply: (content: string, block: DiffBlock): RecoveryResult | null => {
        const searchLines = block.search.split('\n');
        const contentLines = content.split('\n');
        const SIMILARITY_THRESHOLD = 0.85;
        
        // Find the best matching window
        let bestMatch = { start: -1, similarity: 0 };
        
        for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
            let totalSimilarity = 0;
            let validLines = 0;
            
            for (let j = 0; j < searchLines.length; j++) {
                const searchLine = searchLines[j].trim();
                const contentLine = contentLines[i + j].trim();
                
                if (searchLine === '' && contentLine === '') {
                    validLines++;
                    totalSimilarity += 1;
                } else if (searchLine !== '' && contentLine !== '') {
                    const similarity = stringSimilarity(searchLine, contentLine);
                    if (similarity >= SIMILARITY_THRESHOLD) {
                        validLines++;
                        totalSimilarity += similarity;
                    }
                }
            }
            
            const avgSimilarity = validLines > 0 ? totalSimilarity / searchLines.length : 0;
            
            if (avgSimilarity > bestMatch.similarity && validLines >= searchLines.length * 0.8) {
                bestMatch = { start: i, similarity: avgSimilarity };
            }
        }
        
        if (bestMatch.start === -1 || bestMatch.similarity < SIMILARITY_THRESHOLD) {
            return null;
        }
        
        // Apply replacement
        const replaceLines = block.replace.split('\n');
        const originalIndent = contentLines[bestMatch.start].match(/^(\s*)/)?.[1] || '';
        
        const indentedReplace = replaceLines.map((line, idx) => {
            if (line.trim() === '') return '';
            if (idx === 0) return originalIndent + line.trim();
            
            // Try to preserve relative indentation
            const lineIndent = line.match(/^(\s*)/)?.[1] || '';
            const searchFirstIndent = block.replace.split('\n')[0].match(/^(\s*)/)?.[1] || '';
            const relativeIndent = lineIndent.length - searchFirstIndent.length;
            
            return originalIndent + ' '.repeat(Math.max(0, relativeIndent)) + line.trim();
        });
        
        const newLines = [
            ...contentLines.slice(0, bestMatch.start),
            ...indentedReplace,
            ...contentLines.slice(bestMatch.start + searchLines.length),
        ];
        
        return {
            success: true,
            content: newLines.join('\n'),
            strategy: 'fuzzy-line-match',
            confidence: bestMatch.similarity * 0.8, // Lower confidence for fuzzy
            matchInfo: {
                originalLine: bestMatch.start + 1,
                similarity: bestMatch.similarity,
            },
        };
    },
};

/**
 * Strategy 3: Anchor-based matching (find unique lines)
 */
const anchorBasedStrategy: RecoveryStrategy = {
    name: 'anchor-based',
    description: 'Find unique anchor lines and match around them',
    apply: (content: string, block: DiffBlock): RecoveryResult | null => {
        const searchLines = block.search.split('\n');
        const contentLines = content.split('\n');
        
        // Find unique lines in search that appear exactly once in content
        const findUniqueAnchor = (): { searchIdx: number; contentIdx: number } | null => {
            for (let i = 0; i < searchLines.length; i++) {
                const searchLine = searchLines[i].trim();
                if (searchLine.length < 5) continue; // Skip short lines
                
                let matchCount = 0;
                let lastMatchIdx = -1;
                
                for (let j = 0; j < contentLines.length; j++) {
                    if (contentLines[j].trim() === searchLine) {
                        matchCount++;
                        lastMatchIdx = j;
                    }
                }
                
                if (matchCount === 1) {
                    return { searchIdx: i, contentIdx: lastMatchIdx };
                }
            }
            return null;
        };
        
        const anchor = findUniqueAnchor();
        if (!anchor) return null;
        
        // Calculate the window around the anchor
        const contentStart = anchor.contentIdx - anchor.searchIdx;
        const contentEnd = contentStart + searchLines.length;
        
        if (contentStart < 0 || contentEnd > contentLines.length) {
            return null;
        }
        
        // Verify the window roughly matches
        let matchingLines = 0;
        for (let i = 0; i < searchLines.length; i++) {
            if (contentLines[contentStart + i].trim() === searchLines[i].trim()) {
                matchingLines++;
            }
        }
        
        if (matchingLines < searchLines.length * 0.6) {
            return null;
        }
        
        // Apply replacement
        const replaceLines = block.replace.split('\n');
        const originalIndent = contentLines[contentStart].match(/^(\s*)/)?.[1] || '';
        
        const indentedReplace = replaceLines.map((line, idx) => {
            if (line.trim() === '') return '';
            if (idx === 0) return originalIndent + line.trim();
            return originalIndent + line.trimStart();
        });
        
        const newLines = [
            ...contentLines.slice(0, contentStart),
            ...indentedReplace,
            ...contentLines.slice(contentEnd),
        ];
        
        return {
            success: true,
            content: newLines.join('\n'),
            strategy: 'anchor-based',
            confidence: 0.85,
            matchInfo: {
                originalLine: contentStart + 1,
            },
        };
    },
};

/**
 * Strategy 4: Token-based semantic matching
 */
const tokenBasedStrategy: RecoveryStrategy = {
    name: 'token-based',
    description: 'Match based on code tokens/identifiers',
    apply: (content: string, block: DiffBlock): RecoveryResult | null => {
        const searchLines = block.search.split('\n');
        const contentLines = content.split('\n');
        const OVERLAP_THRESHOLD = 0.7;
        
        // Find windows with highest token overlap
        let bestMatch = { start: -1, overlap: 0 };
        
        for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
            const windowContent = contentLines.slice(i, i + searchLines.length).join('\n');
            const overlap = tokenOverlap(block.search, windowContent);
            
            if (overlap > bestMatch.overlap) {
                bestMatch = { start: i, overlap };
            }
        }
        
        if (bestMatch.start === -1 || bestMatch.overlap < OVERLAP_THRESHOLD) {
            return null;
        }
        
        // Verify structure matches (similar line count, function signatures, etc.)
        const replaceLines = block.replace.split('\n');
        const originalIndent = contentLines[bestMatch.start].match(/^(\s*)/)?.[1] || '';
        
        const indentedReplace = replaceLines.map((line, idx) => {
            if (line.trim() === '') return '';
            if (idx === 0) return originalIndent + line.trim();
            return originalIndent + line.trimStart();
        });
        
        const newLines = [
            ...contentLines.slice(0, bestMatch.start),
            ...indentedReplace,
            ...contentLines.slice(bestMatch.start + searchLines.length),
        ];
        
        return {
            success: true,
            content: newLines.join('\n'),
            strategy: 'token-based',
            confidence: bestMatch.overlap * 0.75,
            matchInfo: {
                originalLine: bestMatch.start + 1,
                similarity: bestMatch.overlap,
            },
        };
    },
};

/**
 * Strategy 5: First/last line anchor
 */
const firstLastLineStrategy: RecoveryStrategy = {
    name: 'first-last-line',
    description: 'Match by first and last line of the block',
    apply: (content: string, block: DiffBlock): RecoveryResult | null => {
        const searchLines = block.search.split('\n').filter(l => l.trim());
        if (searchLines.length < 2) return null;
        
        const firstLine = searchLines[0].trim();
        const lastLine = searchLines[searchLines.length - 1].trim();
        const contentLines = content.split('\n');
        
        // Find first line
        for (let i = 0; i < contentLines.length; i++) {
            if (contentLines[i].trim() !== firstLine) continue;
            
            // Look for last line within reasonable distance
            const maxEnd = Math.min(i + searchLines.length + 5, contentLines.length);
            
            for (let j = i + searchLines.length - 1; j < maxEnd; j++) {
                if (contentLines[j].trim() !== lastLine) continue;
                
                // Found potential match
                const windowLines = contentLines.slice(i, j + 1);
                
                // Verify middle content roughly matches
                const windowContent = windowLines.join('\n');
                const overlap = tokenOverlap(block.search, windowContent);
                
                if (overlap < 0.5) continue;
                
                const replaceLines = block.replace.split('\n');
                const originalIndent = contentLines[i].match(/^(\s*)/)?.[1] || '';
                
                const indentedReplace = replaceLines.map((line, idx) => {
                    if (line.trim() === '') return '';
                    if (idx === 0) return originalIndent + line.trim();
                    return originalIndent + line.trimStart();
                });
                
                const newLines = [
                    ...contentLines.slice(0, i),
                    ...indentedReplace,
                    ...contentLines.slice(j + 1),
                ];
                
                return {
                    success: true,
                    content: newLines.join('\n'),
                    strategy: 'first-last-line',
                    confidence: 0.8,
                    matchInfo: {
                        originalLine: i + 1,
                    },
                };
            }
        }
        
        return null;
    },
};

/**
 * All recovery strategies in order of preference
 */
const RECOVERY_STRATEGIES: RecoveryStrategy[] = [
    whitespaceNormalizedStrategy,
    anchorBasedStrategy,
    firstLastLineStrategy,
    fuzzyLineMatchStrategy,
    tokenBasedStrategy,
];

/**
 * Apply a diff block with recovery strategies
 */
export function applyDiffWithRecovery(
    content: string,
    block: DiffBlock,
    minConfidence: number = 0.7
): RecoveryResult {
    // First try exact match
    if (content.includes(block.search)) {
        return {
            success: true,
            content: content.replace(block.search, block.replace),
            strategy: 'exact',
            confidence: 1,
        };
    }
    
    // Try each recovery strategy
    for (const strategy of RECOVERY_STRATEGIES) {
        const result = strategy.apply(content, block);
        
        if (result && result.success && result.confidence >= minConfidence) {
            return result;
        }
    }
    
    // All strategies failed
    return {
        success: false,
        content,
        strategy: 'none',
        confidence: 0,
    };
}

/**
 * Apply multiple diff blocks with recovery
 */
export function applyDiffBlocksWithRecovery(
    originalContent: string,
    blocks: DiffBlock[],
    minConfidence: number = 0.7
): EnhancedDiffResult {
    let content = originalContent;
    const failedBlocks: { search: string; reason: string }[] = [];
    const strategiesUsed = new Set<string>();
    const warnings: string[] = [];
    let appliedBlocks = 0;
    let recoveryUsed = false;
    
    for (const block of blocks) {
        const result = applyDiffWithRecovery(content, block, minConfidence);
        
        if (result.success) {
            content = result.content;
            appliedBlocks++;
            strategiesUsed.add(result.strategy);
            
            if (result.strategy !== 'exact') {
                recoveryUsed = true;
                warnings.push(
                    `Used ${result.strategy} strategy (${Math.round(result.confidence * 100)}% confidence) ` +
                    `for block at line ${result.matchInfo?.originalLine || '?'}`
                );
            }
        } else {
            failedBlocks.push({
                search: block.search.slice(0, 100) + (block.search.length > 100 ? '...' : ''),
                reason: 'No matching text found with any recovery strategy',
            });
        }
    }
    
    return {
        success: failedBlocks.length === 0,
        content,
        appliedBlocks,
        failedBlocks,
        recoveryUsed,
        strategiesAttempted: Array.from(strategiesUsed),
        warnings,
    };
}

/**
 * Suggest fixes for failed diffs
 */
export function suggestDiffFixes(
    content: string,
    failedBlock: DiffBlock
): string[] {
    const suggestions: string[] = [];
    const searchLines = failedBlock.search.split('\n');
    const contentLines = content.split('\n');
    
    // Find similar lines
    for (let i = 0; i < searchLines.length; i++) {
        const searchLine = searchLines[i].trim();
        if (searchLine.length < 10) continue;
        
        for (let j = 0; j < contentLines.length; j++) {
            const contentLine = contentLines[j].trim();
            const similarity = stringSimilarity(searchLine, contentLine);
            
            if (similarity > 0.7 && similarity < 1) {
                suggestions.push(
                    `Line ${i + 1} of SEARCH: "${searchLine.slice(0, 50)}..." ` +
                    `is similar to line ${j + 1}: "${contentLine.slice(0, 50)}..." ` +
                    `(${Math.round(similarity * 100)}% similar)`
                );
            }
        }
    }
    
    if (suggestions.length === 0) {
        suggestions.push(
            'The SEARCH block content was not found in the file. ' +
            'The file may have been modified since the diff was generated.'
        );
    }
    
    return suggestions.slice(0, 5);
}

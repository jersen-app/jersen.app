/**
 * File Relevance Scoring
 * 
 * Scores and filters project files based on relevance to the user's message.
 * This ensures the AI sees the most relevant files first within the token budget.
 */

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ScoredFile {
    path: string;
    content: string;
    relevance: number;
    matchReasons: string[];
}

export interface RelevanceOptions {
    maxFiles?: number;
    minScore?: number;
    boostRecent?: boolean;
    recentlyModified?: string[]; // Paths of recently modified files
}

/**
 * Extract keywords from user message for matching
 */
export function extractKeywords(message: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
        'my', 'your', 'his', 'its', 'our', 'their', 'what', 'which', 'who', 'whom',
        'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
        'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than',
        'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
        'please', 'help', 'want', 'need', 'make', 'create', 'add', 'update', 'change',
        'fix', 'build', 'implement', 'show', 'display', 'get', 'set', 'use', 'using',
    ]);
    
    // Extract words
    const words = message.toLowerCase()
        .replace(/[^a-z0-9\s-_]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Extract potential file paths or component names
    const pathPatterns = message.match(/[a-zA-Z][a-zA-Z0-9_-]*\.(tsx?|jsx?|css|json)/g) || [];
    const componentPatterns = message.match(/\b[A-Z][a-zA-Z0-9]+\b/g) || [];
    
    // Extract quoted strings (often specific references)
    const quotedStrings = message.match(/["'`]([^"'`]+)["'`]/g)?.map(s => s.slice(1, -1)) || [];
    
    return [...new Set([
        ...words,
        ...pathPatterns.map(p => p.toLowerCase()),
        ...componentPatterns.map(c => c.toLowerCase()),
        ...quotedStrings.map(s => s.toLowerCase()),
    ])];
}

/**
 * Detect feature context from message
 */
export function detectFeatureContext(message: string): {
    isAuthRelated: boolean;
    isDatabaseRelated: boolean;
    isStorageRelated: boolean;
    isApiRelated: boolean;
    isComponentRelated: boolean;
    isLayoutRelated: boolean;
    isStyleRelated: boolean;
} {
    const lowerMessage = message.toLowerCase();
    
    return {
        isAuthRelated: /\b(auth|login|logout|signup|sign.?in|sign.?out|session|user|password|oauth|token)\b/.test(lowerMessage),
        isDatabaseRelated: /\b(database|db|data|save|store|fetch|query|collection|document|mongodb|crud)\b/.test(lowerMessage),
        isStorageRelated: /\b(upload|file|image|photo|storage|download|media|attachment|avatar)\b/.test(lowerMessage),
        isApiRelated: /\b(api|endpoint|route|request|response|fetch|post|get|delete|patch|server)\b/.test(lowerMessage),
        isComponentRelated: /\b(component|button|form|input|modal|dialog|card|list|table|nav|header|footer)\b/.test(lowerMessage),
        isLayoutRelated: /\b(layout|page|navigation|sidebar|header|footer|template)\b/.test(lowerMessage),
        isStyleRelated: /\b(style|css|tailwind|color|theme|dark|light|responsive|mobile)\b/.test(lowerMessage),
    };
}

/**
 * Calculate relevance score for a single file
 */
export function calculateFileRelevance(
    file: { path: string; content: string },
    keywords: string[],
    featureContext: ReturnType<typeof detectFeatureContext>,
    options: RelevanceOptions = {}
): ScoredFile {
    let score = 0;
    const matchReasons: string[] = [];
    const lowerPath = file.path.toLowerCase();
    const lowerContent = file.content.toLowerCase();
    
    // === Path-based scoring ===
    
    // Direct path mention in keywords
    for (const keyword of keywords) {
        if (lowerPath.includes(keyword)) {
            score += 20;
            matchReasons.push(`Path contains "${keyword}"`);
        }
    }
    
    // File name match
    const fileName = lowerPath.split('/').pop() || '';
    for (const keyword of keywords) {
        if (fileName.includes(keyword)) {
            score += 15;
            matchReasons.push(`Filename contains "${keyword}"`);
        }
    }
    
    // === Content-based scoring ===
    
    for (const keyword of keywords) {
        // Escape regex special characters to prevent invalid regex errors
        const escapedKeyword = escapeRegex(keyword);
        const occurrences = (lowerContent.match(new RegExp(escapedKeyword, 'g')) || []).length;
        if (occurrences > 0) {
            // Diminishing returns for many occurrences
            const contentScore = Math.min(occurrences * 2, 10);
            score += contentScore;
            if (occurrences >= 3) {
                matchReasons.push(`Contains "${keyword}" (${occurrences}x)`);
            }
        }
    }
    
    // === Feature context scoring ===
    
    if (featureContext.isAuthRelated) {
        if (lowerPath.includes('auth') || lowerPath.includes('login') || lowerPath.includes('session')) {
            score += 30;
            matchReasons.push('Auth-related file');
        }
        if (lowerContent.includes('useauth') || lowerContent.includes('getuser') || lowerContent.includes('login')) {
            score += 15;
        }
    }
    
    if (featureContext.isDatabaseRelated) {
        if (lowerPath.includes('db') || lowerPath.includes('database') || lowerPath.includes('jersen-db')) {
            score += 30;
            matchReasons.push('Database-related file');
        }
        if (lowerContent.includes('insertone') || lowerContent.includes('find(') || lowerContent.includes('updateone')) {
            score += 15;
        }
    }
    
    if (featureContext.isStorageRelated) {
        if (lowerPath.includes('storage') || lowerPath.includes('upload')) {
            score += 30;
            matchReasons.push('Storage-related file');
        }
        if (lowerContent.includes('uploadfile') || lowerContent.includes('getfileurl')) {
            score += 15;
        }
    }
    
    if (featureContext.isApiRelated) {
        if (lowerPath.includes('app/api/') || lowerPath.includes('route.ts')) {
            score += 25;
            matchReasons.push('API route');
        }
    }
    
    if (featureContext.isComponentRelated) {
        if (lowerPath.includes('components/')) {
            score += 20;
            matchReasons.push('Component file');
        }
    }
    
    if (featureContext.isLayoutRelated) {
        if (lowerPath.includes('layout.tsx') || lowerPath.includes('page.tsx')) {
            score += 25;
            matchReasons.push('Layout/Page file');
        }
    }
    
    // === Priority files (always somewhat relevant) ===
    
    // Root layout is always important
    if (file.path === 'app/layout.tsx') {
        score += 50;
        matchReasons.push('Root layout (critical)');
    }
    
    // Main page
    if (file.path === 'app/page.tsx') {
        score += 30;
        matchReasons.push('Main page');
    }
    
    // Library files are often important
    if (lowerPath.startsWith('lib/')) {
        score += 15;
    }
    
    // Hooks
    if (lowerPath.startsWith('hooks/')) {
        score += 12;
    }
    
    // Recently modified files boost
    if (options.boostRecent && options.recentlyModified?.includes(file.path)) {
        score += 25;
        matchReasons.push('Recently modified');
    }
    
    // === Negative scoring ===
    
    // Config files are less relevant for most tasks
    if (lowerPath.match(/\.(json|config\.|rc\.)/) && !lowerPath.includes('tsconfig')) {
        score -= 10;
    }
    
    // Test files
    if (lowerPath.includes('.test.') || lowerPath.includes('.spec.') || lowerPath.includes('__tests__')) {
        score -= 20;
    }
    
    return {
        ...file,
        relevance: Math.max(0, score),
        matchReasons,
    };
}

/**
 * Get relevant files sorted by relevance score
 */
export function getRelevantFiles(
    files: Array<{ path: string; content: string }>,
    userMessage: string,
    options: RelevanceOptions = {}
): ScoredFile[] {
    const {
        maxFiles = 15,
        minScore = 5,
        boostRecent = true,
        recentlyModified = [],
    } = options;
    
    if (files.length === 0) return [];
    
    const keywords = extractKeywords(userMessage);
    const featureContext = detectFeatureContext(userMessage);
    
    // Score all files
    const scoredFiles = files.map(file => 
        calculateFileRelevance(file, keywords, featureContext, { boostRecent, recentlyModified })
    );
    
    // Sort by relevance (highest first)
    scoredFiles.sort((a, b) => b.relevance - a.relevance);
    
    // Filter by minimum score and limit
    const relevantFiles = scoredFiles
        .filter(f => f.relevance >= minScore)
        .slice(0, maxFiles);
    
    // Always include critical files if not already present
    const criticalPaths = ['app/layout.tsx', 'app/page.tsx'];
    for (const criticalPath of criticalPaths) {
        if (!relevantFiles.find(f => f.path === criticalPath)) {
            const criticalFile = scoredFiles.find(f => f.path === criticalPath);
            if (criticalFile) {
                relevantFiles.push(criticalFile);
            }
        }
    }
    
    return relevantFiles;
}

/**
 * Get a summary of file relevance for debugging
 */
export function getRelevanceSummary(
    files: Array<{ path: string; content: string }>,
    userMessage: string
): {
    keywords: string[];
    featureContext: ReturnType<typeof detectFeatureContext>;
    topFiles: Array<{ path: string; score: number; reasons: string[] }>;
} {
    const keywords = extractKeywords(userMessage);
    const featureContext = detectFeatureContext(userMessage);
    const relevant = getRelevantFiles(files, userMessage, { maxFiles: 10 });
    
    return {
        keywords: keywords.slice(0, 20), // Limit for readability
        featureContext,
        topFiles: relevant.map(f => ({
            path: f.path,
            score: f.relevance,
            reasons: f.matchReasons,
        })),
    };
}

/**
 * Smart file selection that balances relevance with coverage
 */
export function selectFilesForContext(
    files: Array<{ path: string; content: string }>,
    userMessage: string,
    maxTokens: number
): ScoredFile[] {
    const CHARS_PER_TOKEN = 4;
    
    // Get relevant files
    const relevantFiles = getRelevantFiles(files, userMessage, { maxFiles: 30 });
    
    // Select files within token budget
    const selected: ScoredFile[] = [];
    let usedTokens = 0;
    
    for (const file of relevantFiles) {
        const fileTokens = Math.ceil(file.content.length / CHARS_PER_TOKEN);
        
        if (usedTokens + fileTokens <= maxTokens) {
            selected.push(file);
            usedTokens += fileTokens;
        } else if (fileTokens > maxTokens / 3) {
            // Large file - include truncated version if very relevant
            if (file.relevance >= 50) {
                const truncatedContent = file.content.slice(0, maxTokens * CHARS_PER_TOKEN / 4);
                selected.push({
                    ...file,
                    content: truncatedContent + '\n\n// ... (truncated)',
                });
                usedTokens += maxTokens / 4;
            }
        }
        
        if (usedTokens >= maxTokens * 0.9) break;
    }
    
    return selected;
}

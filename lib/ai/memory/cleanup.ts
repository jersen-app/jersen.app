/**
 * Enhanced Memory System - Cleanup
 * 
 * Clean up stale context, outdated decisions, and expired entries
 */

import type { EnhancedDecision, ContextEntry, ImportantEvent } from './types';

export interface CleanupResult {
    removedDecisions: string[];
    removedContext: string[];
    removedEvents: string[];
    totalRemoved: number;
}

export interface CleanupOptions {
    maxDecisionAge?: number;      // Days before old low-priority decisions expire
    maxContextAge?: number;       // Days before context entries expire
    maxEventAge?: number;         // Days before events expire
    maxDecisions?: number;        // Maximum decisions to keep
    maxContextEntries?: number;   // Maximum context entries to keep
    maxEvents?: number;           // Maximum events to keep
    preserveHighPriority?: boolean; // Keep high-priority decisions regardless of age
}

const DEFAULT_OPTIONS: Required<CleanupOptions> = {
    maxDecisionAge: 14,           // 2 weeks
    maxContextAge: 7,             // 1 week
    maxEventAge: 7,               // 1 week
    maxDecisions: 20,
    maxContextEntries: 30,
    maxEvents: 50,
    preserveHighPriority: true,
};

/**
 * Check if a date is older than a given number of days
 */
function isOlderThan(date: Date, days: number): boolean {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date < cutoff;
}

/**
 * Clean up stale decisions
 */
export function cleanupDecisions(
    decisions: EnhancedDecision[],
    options: CleanupOptions = {}
): { kept: EnhancedDecision[]; removed: EnhancedDecision[] } {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const removed: EnhancedDecision[] = [];
    
    let kept = decisions.filter(decision => {
        // Remove decisions marked as no longer relevant
        if (!decision.stillRelevant) {
            removed.push(decision);
            return false;
        }
        
        // Keep high-priority decisions if configured
        if (opts.preserveHighPriority && decision.priority === 'high') {
            return true;
        }
        
        // Check age for low-priority decisions
        if (decision.priority === 'low' && isOlderThan(decision.timestamp, opts.maxDecisionAge)) {
            removed.push(decision);
            return false;
        }
        
        // Medium priority gets slightly longer retention
        if (decision.priority === 'medium' && isOlderThan(decision.timestamp, opts.maxDecisionAge * 1.5)) {
            removed.push(decision);
            return false;
        }
        
        return true;
    });
    
    // Limit total count (keep most recent + high priority)
    if (kept.length > opts.maxDecisions) {
        const highPriority = kept.filter(d => d.priority === 'high');
        const others = kept
            .filter(d => d.priority !== 'high')
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        const toKeep = opts.maxDecisions - highPriority.length;
        const keptOthers = others.slice(0, Math.max(0, toKeep));
        const removedOthers = others.slice(toKeep);
        
        kept = [...highPriority, ...keptOthers];
        removed.push(...removedOthers);
    }
    
    return { kept, removed };
}

/**
 * Clean up stale context entries
 */
export function cleanupContext(
    context: ContextEntry[],
    options: CleanupOptions = {}
): { kept: ContextEntry[]; removed: ContextEntry[] } {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const removed: ContextEntry[] = [];
    const now = new Date();
    
    let kept = context.filter(entry => {
        // Check explicit expiration
        if (entry.expiresAt && entry.expiresAt < now) {
            removed.push(entry);
            return false;
        }
        
        // Check age
        if (isOlderThan(entry.timestamp, opts.maxContextAge)) {
            removed.push(entry);
            return false;
        }
        
        return true;
    });
    
    // Remove duplicate keys (keep most recent)
    const keyMap = new Map<string, ContextEntry>();
    for (const entry of kept.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())) {
        if (!keyMap.has(entry.key)) {
            keyMap.set(entry.key, entry);
        } else {
            removed.push(entry);
        }
    }
    kept = Array.from(keyMap.values());
    
    // Limit total count
    if (kept.length > opts.maxContextEntries) {
        const sorted = kept.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        kept = sorted.slice(0, opts.maxContextEntries);
        removed.push(...sorted.slice(opts.maxContextEntries));
    }
    
    return { kept, removed };
}

/**
 * Clean up old events
 */
export function cleanupEvents(
    events: ImportantEvent[],
    options: CleanupOptions = {}
): { kept: ImportantEvent[]; removed: ImportantEvent[] } {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const removed: ImportantEvent[] = [];
    
    let kept = events.filter(event => {
        if (isOlderThan(event.timestamp, opts.maxEventAge)) {
            removed.push(event);
            return false;
        }
        return true;
    });
    
    // Limit total count
    if (kept.length > opts.maxEvents) {
        const sorted = kept.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        kept = sorted.slice(0, opts.maxEvents);
        removed.push(...sorted.slice(opts.maxEvents));
    }
    
    return { kept, removed };
}

/**
 * Detect conflicting decisions
 */
export function detectConflicts(decisions: EnhancedDecision[]): Array<{
    decision1: EnhancedDecision;
    decision2: EnhancedDecision;
    reason: string;
}> {
    const conflicts: Array<{
        decision1: EnhancedDecision;
        decision2: EnhancedDecision;
        reason: string;
    }> = [];
    
    // Simple conflict detection based on keywords
    const conflictPatterns: Array<{
        pattern1: RegExp;
        pattern2: RegExp;
        description: string;
    }> = [
        {
            pattern1: /use (\w+) for state/i,
            pattern2: /use (\w+) for state/i,
            description: 'Multiple state management choices',
        },
        {
            pattern1: /use (\w+) for styling/i,
            pattern2: /use (\w+) for styling/i,
            description: 'Multiple styling approaches',
        },
        {
            pattern1: /use server components/i,
            pattern2: /use client components/i,
            description: 'Server vs client component preference',
        },
    ];
    
    for (let i = 0; i < decisions.length; i++) {
        for (let j = i + 1; j < decisions.length; j++) {
            const d1 = decisions[i];
            const d2 = decisions[j];
            
            for (const { pattern1, pattern2, description } of conflictPatterns) {
                const match1 = d1.decision.match(pattern1);
                const match2 = d2.decision.match(pattern2);
                
                if (match1 && match2 && match1[1] !== match2[1]) {
                    conflicts.push({
                        decision1: d1,
                        decision2: d2,
                        reason: `${description}: "${match1[1]}" vs "${match2[1]}"`,
                    });
                }
            }
        }
    }
    
    return conflicts;
}

/**
 * Resolve conflicts by keeping the most recent or highest priority
 */
export function resolveConflicts(
    decisions: EnhancedDecision[],
    strategy: 'recent' | 'priority' = 'recent'
): EnhancedDecision[] {
    const conflicts = detectConflicts(decisions);
    const toRemove = new Set<string>();
    
    for (const conflict of conflicts) {
        let keepDecision: EnhancedDecision;
        let removeDecision: EnhancedDecision;
        
        if (strategy === 'priority') {
            // Keep higher priority, or more recent if same priority
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const p1 = priorityOrder[conflict.decision1.priority];
            const p2 = priorityOrder[conflict.decision2.priority];
            
            if (p1 !== p2) {
                keepDecision = p1 > p2 ? conflict.decision1 : conflict.decision2;
                removeDecision = p1 > p2 ? conflict.decision2 : conflict.decision1;
            } else {
                keepDecision = conflict.decision1.timestamp > conflict.decision2.timestamp 
                    ? conflict.decision1 : conflict.decision2;
                removeDecision = conflict.decision1.timestamp > conflict.decision2.timestamp 
                    ? conflict.decision2 : conflict.decision1;
            }
        } else {
            // Keep more recent
            keepDecision = conflict.decision1.timestamp > conflict.decision2.timestamp 
                ? conflict.decision1 : conflict.decision2;
            removeDecision = conflict.decision1.timestamp > conflict.decision2.timestamp 
                ? conflict.decision2 : conflict.decision1;
        }
        
        toRemove.add(removeDecision.id);
    }
    
    return decisions.filter(d => !toRemove.has(d.id));
}

/**
 * Full cleanup of memory
 */
export function cleanupMemory(
    decisions: EnhancedDecision[],
    context: ContextEntry[],
    events: ImportantEvent[],
    options: CleanupOptions = {}
): {
    decisions: EnhancedDecision[];
    context: ContextEntry[];
    events: ImportantEvent[];
    result: CleanupResult;
} {
    // Clean up each category
    const decisionsCleanup = cleanupDecisions(decisions, options);
    const contextCleanup = cleanupContext(context, options);
    const eventsCleanup = cleanupEvents(events, options);
    
    // Resolve conflicts in decisions
    const resolvedDecisions = resolveConflicts(decisionsCleanup.kept);
    
    return {
        decisions: resolvedDecisions,
        context: contextCleanup.kept,
        events: eventsCleanup.kept,
        result: {
            removedDecisions: decisionsCleanup.removed.map(d => d.id),
            removedContext: contextCleanup.removed.map(c => c.key),
            removedEvents: eventsCleanup.removed.map(e => e.id),
            totalRemoved: 
                decisionsCleanup.removed.length + 
                contextCleanup.removed.length + 
                eventsCleanup.removed.length,
        },
    };
}

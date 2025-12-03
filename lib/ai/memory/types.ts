/**
 * Enhanced Memory System - Types
 * 
 * Type definitions for the memory system
 */

export type DecisionPriority = 'high' | 'medium' | 'low';
export type EventType = 'architecture_decision' | 'user_preference' | 'error_pattern' | 'feature_completed' | 'tech_choice';

export interface EnhancedDecision {
    id: string;
    decision: string;
    reason: string;
    priority: DecisionPriority;
    timestamp: Date;
    stillRelevant: boolean;
    tags?: string[];
    relatedFiles?: string[];
}

export interface ImportantEvent {
    id: string;
    type: EventType;
    summary: string;
    details: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export interface ContextEntry {
    key: string;
    value: string;
    timestamp: Date;
    expiresAt?: Date;
}

export interface EnhancedMemory {
    projectId: string;
    orgId: string;
    
    // Summary of the conversation/project
    summary: string;
    lastSummarizedAt: Date;
    messageCountAtSummary: number;
    
    // Key decisions with priority
    decisions: EnhancedDecision[];
    
    // Technologies/patterns being used
    techStack: string[];
    
    // Important context
    context: ContextEntry[];
    
    // Recent important events
    events: ImportantEvent[];
    
    // User preferences
    preferences: {
        codingStyle?: 'verbose' | 'concise';
        preferredPatterns?: string[];
        dislikedPatterns?: string[];
    };
    
    createdAt: Date;
    updatedAt: Date;
}

export interface MemorySummaryRequest {
    projectId: string;
    orgId: string;
    messages: Array<{
        role: string;
        content: string;
    }>;
    existingSummary?: string;
}

export interface MemoryContextResult {
    summary: string;
    decisions: EnhancedDecision[];
    techStack: string[];
    context: ContextEntry[];
    recentEvents: ImportantEvent[];
    formatted: string;
}

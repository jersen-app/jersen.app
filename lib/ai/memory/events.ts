/**
 * Enhanced Memory System - Events
 * 
 * Capture and manage important events during AI conversations
 */

import { randomUUID } from 'crypto';
import type { ImportantEvent, EventType, EnhancedDecision, DecisionPriority } from './types';

// In-memory event buffer (flushed to DB periodically)
const eventBuffer = new Map<string, ImportantEvent[]>();

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
    return `evt_${randomUUID().slice(0, 8)}`;
}

/**
 * Capture an important event immediately
 */
export function captureEvent(
    projectId: string,
    type: EventType,
    summary: string,
    details: string,
    metadata?: Record<string, unknown>
): ImportantEvent {
    const event: ImportantEvent = {
        id: generateEventId(),
        type,
        summary,
        details,
        timestamp: new Date(),
        metadata,
    };
    
    // Add to buffer
    if (!eventBuffer.has(projectId)) {
        eventBuffer.set(projectId, []);
    }
    eventBuffer.get(projectId)!.push(event);
    
    // Keep buffer size manageable
    const buffer = eventBuffer.get(projectId)!;
    if (buffer.length > 50) {
        buffer.splice(0, buffer.length - 50);
    }
    
    return event;
}

/**
 * Get buffered events for a project
 */
export function getBufferedEvents(projectId: string): ImportantEvent[] {
    return eventBuffer.get(projectId) || [];
}

/**
 * Clear buffered events after flushing to DB
 */
export function clearBufferedEvents(projectId: string): void {
    eventBuffer.delete(projectId);
}

/**
 * Detect important events from AI response
 */
export function detectEventsFromResponse(
    projectId: string,
    aiResponse: string,
    userMessage: string
): ImportantEvent[] {
    const events: ImportantEvent[] = [];
    const lowerResponse = aiResponse.toLowerCase();
    const lowerMessage = userMessage.toLowerCase();
    
    // Detect architecture decisions
    const architecturePatterns = [
        /i(?:'ll|'m going to) use (\w+) for/gi,
        /(?:we should|let's) use (\w+) for/gi,
        /the best approach (?:is|would be) (\w+)/gi,
        /i recommend using (\w+)/gi,
    ];
    
    for (const pattern of architecturePatterns) {
        const matches = aiResponse.matchAll(pattern);
        for (const match of matches) {
            events.push({
                id: generateEventId(),
                type: 'architecture_decision',
                summary: `Decided to use ${match[1]}`,
                details: match[0],
                timestamp: new Date(),
            });
        }
    }
    
    // Detect user preferences from message
    const preferencePatterns = [
        /i (?:prefer|like|want) (\w+)/gi,
        /(?:don't|do not) use (\w+)/gi,
        /always use (\w+)/gi,
        /never use (\w+)/gi,
    ];
    
    for (const pattern of preferencePatterns) {
        const matches = userMessage.matchAll(pattern);
        for (const match of matches) {
            events.push({
                id: generateEventId(),
                type: 'user_preference',
                summary: `User preference: ${match[0]}`,
                details: userMessage.slice(0, 200),
                timestamp: new Date(),
            });
        }
    }
    
    // Detect feature completion
    if (
        lowerResponse.includes('done') ||
        lowerResponse.includes('complete') ||
        lowerResponse.includes('finished implementing')
    ) {
        // Try to extract what was completed
        const completionMatch = aiResponse.match(/(?:done|complete|finished implementing)[^.]*(?:the|a)\s+(\w+(?:\s+\w+)?)/i);
        if (completionMatch) {
            events.push({
                id: generateEventId(),
                type: 'feature_completed',
                summary: `Completed: ${completionMatch[1]}`,
                details: completionMatch[0],
                timestamp: new Date(),
            });
        }
    }
    
    // Detect tech choices
    const techPatterns = [
        /(?:using|with|via)\s+(zustand|react-query|tanstack|framer-motion|tailwind|shadcn)/gi,
        /(?:installed|adding|add)\s+([\w-]+)\s+(?:package|library|dependency)/gi,
    ];
    
    for (const pattern of techPatterns) {
        const matches = aiResponse.matchAll(pattern);
        for (const match of matches) {
            events.push({
                id: generateEventId(),
                type: 'tech_choice',
                summary: `Using ${match[1]}`,
                details: match[0],
                timestamp: new Date(),
            });
        }
    }
    
    // Store detected events
    for (const event of events) {
        captureEvent(projectId, event.type, event.summary, event.details, event.metadata);
    }
    
    return events;
}

/**
 * Create a decision from an event
 */
export function eventToDecision(
    event: ImportantEvent,
    priority: DecisionPriority = 'medium'
): EnhancedDecision {
    return {
        id: `dec_${event.id.slice(4)}`,
        decision: event.summary,
        reason: event.details,
        priority,
        timestamp: event.timestamp,
        stillRelevant: true,
        tags: [event.type],
    };
}

/**
 * Prioritize decision based on keywords
 */
export function determineDecisionPriority(decision: string, reason: string): DecisionPriority {
    const text = `${decision} ${reason}`.toLowerCase();
    
    // High priority indicators
    const highPriorityPatterns = [
        'security', 'auth', 'authentication', 'password', 'token',
        'database schema', 'data model', 'architecture',
        'critical', 'important', 'must', 'required',
        'breaking change', 'migration',
    ];
    
    if (highPriorityPatterns.some(p => text.includes(p))) {
        return 'high';
    }
    
    // Low priority indicators
    const lowPriorityPatterns = [
        'style', 'format', 'naming', 'convention',
        'preference', 'optional', 'nice to have',
        'minor', 'small',
    ];
    
    if (lowPriorityPatterns.some(p => text.includes(p))) {
        return 'low';
    }
    
    return 'medium';
}

/**
 * Filter events by type
 */
export function filterEventsByType(
    events: ImportantEvent[],
    types: EventType[]
): ImportantEvent[] {
    return events.filter(e => types.includes(e.type));
}

/**
 * Get recent events (last N)
 */
export function getRecentEvents(
    events: ImportantEvent[],
    count: number = 10
): ImportantEvent[] {
    return events
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, count);
}

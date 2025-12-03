/**
 * Enhanced Memory System - Main Module
 * 
 * Provides improved memory management with priority decisions,
 * event tracking, and automatic cleanup.
 */

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import connectToDatabase from "@/lib/db";
import ProjectMemory from "@/models/ProjectMemory";
import ChatMessage from "@/models/ChatMessage";
import type { 
    EnhancedMemory, 
    EnhancedDecision, 
    ContextEntry, 
    ImportantEvent,
    MemoryContextResult,
    DecisionPriority,
    EventType,
} from './types';
import { 
    captureEvent, 
    getBufferedEvents, 
    clearBufferedEvents,
    detectEventsFromResponse,
    determineDecisionPriority,
} from './events';
import { cleanupMemory, type CleanupOptions } from './cleanup';

// Re-export types
export * from './types';
export * from './events';
export * from './cleanup';

// Configuration
const SUMMARY_THRESHOLD = 10; // Re-summarize every 10 messages
const CLEANUP_THRESHOLD = 5;  // Cleanup every 5 summaries

/**
 * Get or create enhanced project memory
 */
export async function getEnhancedMemory(
    projectId: string, 
    orgId: string
): Promise<EnhancedMemory> {
    await connectToDatabase();
    
    const memory = await ProjectMemory.findOne({ projectId }).lean();
    
    if (!memory) {
        // Create new memory
        const newMemory = await ProjectMemory.create({
            projectId,
            orgId,
            summary: "",
            decisions: [],
            techStack: [],
            context: [],
            messageCountAtSummary: 0,
        });
        
        return {
            projectId,
            orgId,
            summary: "",
            lastSummarizedAt: new Date(),
            messageCountAtSummary: 0,
            decisions: [],
            techStack: [],
            context: [],
            events: [],
            preferences: {},
            createdAt: newMemory.createdAt,
            updatedAt: newMemory.updatedAt,
        };
    }
    
    // Convert to enhanced format
    const enhancedDecisions: EnhancedDecision[] = (memory.decisions || []).map((d: any, i: number) => ({
        id: `dec_${i}`,
        decision: d.decision,
        reason: d.reason,
        priority: d.priority || 'medium',
        timestamp: d.timestamp || new Date(),
        stillRelevant: d.stillRelevant !== false,
        tags: d.tags || [],
        relatedFiles: d.relatedFiles || [],
    }));
    
    const enhancedContext: ContextEntry[] = (memory.context || []).map((c: any) => ({
        key: c.key,
        value: c.value,
        timestamp: c.timestamp || new Date(),
        expiresAt: c.expiresAt,
    }));
    
    return {
        projectId,
        orgId,
        summary: memory.summary || "",
        lastSummarizedAt: memory.lastSummarizedAt || new Date(),
        messageCountAtSummary: memory.messageCountAtSummary || 0,
        decisions: enhancedDecisions,
        techStack: memory.techStack || [],
        context: enhancedContext,
        events: getBufferedEvents(projectId),
        preferences: {},
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
    };
}

/**
 * Check if we need to generate a new summary
 */
export async function shouldSummarize(projectId: string): Promise<boolean> {
    await connectToDatabase();
    
    const memory = await ProjectMemory.findOne({ projectId });
    const messageCount = await ChatMessage.countDocuments({ projectId });
    
    if (!memory) return messageCount >= SUMMARY_THRESHOLD;
    
    const messagesSinceSummary = messageCount - (memory.messageCountAtSummary || 0);
    return messagesSinceSummary >= SUMMARY_THRESHOLD;
}

/**
 * Generate an enhanced summary with decision extraction
 */
export async function generateEnhancedSummary(
    projectId: string, 
    orgId: string
): Promise<{ summary: string; extractedDecisions: EnhancedDecision[] }> {
    await connectToDatabase();
    
    // Get recent messages
    const messages = await ChatMessage.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    
    if (messages.length === 0) {
        return { summary: "", extractedDecisions: [] };
    }
    
    // Get existing memory
    const existingMemory = await getEnhancedMemory(projectId, orgId);
    
    // Build prompt for summarization
    const conversationText = messages
        .reverse()
        .map((m: any) => `${m.role}: ${m.content.slice(0, 500)}${m.content.length > 500 ? '...' : ''}`)
        .join('\n\n');
    
    const prompt = `You are summarizing a coding conversation for future context. 

${existingMemory.summary ? `Previous summary: ${existingMemory.summary}\n\n` : ''}

Recent conversation:
${conversationText}

Provide your response in the following JSON format:
{
  "summary": "A concise summary (max 300 words) of what the user is building, key technologies, and current progress",
  "decisions": [
    {
      "decision": "What was decided",
      "reason": "Why this decision was made",
      "priority": "high" | "medium" | "low",
      "tags": ["relevant", "tags"]
    }
  ],
  "techStack": ["list", "of", "technologies", "mentioned"]
}

Focus on:
1. What the user is building (project type, purpose)
2. Key technologies and patterns being used  
3. Important decisions made (architecture, patterns, tools)
4. Current state/progress
5. Any user preferences or requirements mentioned

Be specific about file names, component names, and technical details.`;

    try {
        const result = await generateText({
            model: google("gemini-2.0-flash"),
            prompt,
        });
        
        // Parse JSON response
        let parsed: {
            summary: string;
            decisions: Array<{
                decision: string;
                reason: string;
                priority: DecisionPriority;
                tags?: string[];
            }>;
            techStack: string[];
        };
        
        try {
            // Extract JSON from response (may be wrapped in markdown)
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: result.text, decisions: [], techStack: [] };
        } catch {
            parsed = { summary: result.text.trim(), decisions: [], techStack: [] };
        }
        
        // Convert to enhanced decisions
        const extractedDecisions: EnhancedDecision[] = (parsed.decisions || []).map((d, i) => ({
            id: `dec_${Date.now()}_${i}`,
            decision: d.decision,
            reason: d.reason,
            priority: d.priority || determineDecisionPriority(d.decision, d.reason),
            timestamp: new Date(),
            stillRelevant: true,
            tags: d.tags || [],
        }));
        
        // Update memory
        const messageCount = await ChatMessage.countDocuments({ projectId });
        
        // Merge with existing decisions (avoid duplicates)
        const existingDecisionTexts = new Set(existingMemory.decisions.map(d => d.decision.toLowerCase()));
        const newDecisions = extractedDecisions.filter(
            d => !existingDecisionTexts.has(d.decision.toLowerCase())
        );
        
        const allDecisions = [...existingMemory.decisions, ...newDecisions];
        
        // Merge tech stack
        const allTechStack = [...new Set([
            ...existingMemory.techStack,
            ...(parsed.techStack || []),
        ])];
        
        // Run cleanup if needed
        const summaryCount = Math.floor(messageCount / SUMMARY_THRESHOLD);
        let finalDecisions = allDecisions;
        let finalContext = existingMemory.context;
        let finalEvents = existingMemory.events;
        
        if (summaryCount % CLEANUP_THRESHOLD === 0) {
            const cleaned = cleanupMemory(allDecisions, existingMemory.context, existingMemory.events);
            finalDecisions = cleaned.decisions;
            finalContext = cleaned.context;
            finalEvents = cleaned.events;
            
            console.log(`Memory cleanup for ${projectId}: removed ${cleaned.result.totalRemoved} items`);
        }
        
        // Save to database
        await ProjectMemory.findOneAndUpdate(
            { projectId },
            {
                $set: {
                    summary: parsed.summary,
                    lastSummarizedAt: new Date(),
                    messageCountAtSummary: messageCount,
                    orgId,
                    decisions: finalDecisions.map(d => ({
                        decision: d.decision,
                        reason: d.reason,
                        priority: d.priority,
                        timestamp: d.timestamp,
                        stillRelevant: d.stillRelevant,
                        tags: d.tags,
                        relatedFiles: d.relatedFiles,
                    })),
                    techStack: allTechStack,
                    context: finalContext.map(c => ({
                        key: c.key,
                        value: c.value,
                        timestamp: c.timestamp,
                        expiresAt: c.expiresAt,
                    })),
                },
            },
            { upsert: true }
        );
        
        // Clear buffered events after saving
        clearBufferedEvents(projectId);
        
        return { summary: parsed.summary, extractedDecisions: newDecisions };
    } catch (error) {
        console.error("Failed to generate enhanced summary:", error);
        return { summary: existingMemory.summary, extractedDecisions: [] };
    }
}

/**
 * Add a decision with priority
 */
export async function addDecision(
    projectId: string,
    orgId: string,
    decision: string,
    reason: string,
    priority: DecisionPriority = 'medium',
    tags?: string[],
    relatedFiles?: string[]
): Promise<EnhancedDecision> {
    await connectToDatabase();
    
    const newDecision: EnhancedDecision = {
        id: `dec_${Date.now()}`,
        decision,
        reason,
        priority,
        timestamp: new Date(),
        stillRelevant: true,
        tags,
        relatedFiles,
    };
    
    await ProjectMemory.findOneAndUpdate(
        { projectId },
        {
            $push: {
                decisions: {
                    decision: newDecision.decision,
                    reason: newDecision.reason,
                    priority: newDecision.priority,
                    timestamp: newDecision.timestamp,
                    stillRelevant: newDecision.stillRelevant,
                    tags: newDecision.tags,
                    relatedFiles: newDecision.relatedFiles,
                },
            },
            $set: { orgId },
        },
        { upsert: true }
    );
    
    return newDecision;
}

/**
 * Add context with optional expiration
 */
export async function addContext(
    projectId: string,
    orgId: string,
    key: string,
    value: string,
    expiresInDays?: number
): Promise<ContextEntry> {
    await connectToDatabase();
    
    const entry: ContextEntry = {
        key,
        value,
        timestamp: new Date(),
        expiresAt: expiresInDays 
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : undefined,
    };
    
    // Remove existing entry with same key and add new one
    await ProjectMemory.findOneAndUpdate(
        { projectId },
        {
            $pull: { context: { key } },
        }
    );
    
    await ProjectMemory.findOneAndUpdate(
        { projectId },
        {
            $push: {
                context: {
                    key: entry.key,
                    value: entry.value,
                    timestamp: entry.timestamp,
                    expiresAt: entry.expiresAt,
                },
            },
            $set: { orgId },
        },
        { upsert: true }
    );
    
    return entry;
}

/**
 * Add tech stack item
 */
export async function addTechStack(
    projectId: string,
    orgId: string,
    tech: string
): Promise<void> {
    await connectToDatabase();
    
    await ProjectMemory.findOneAndUpdate(
        { projectId },
        {
            $addToSet: { techStack: tech },
            $set: { orgId },
        },
        { upsert: true }
    );
}

/**
 * Build memory context for AI prompt
 */
export async function buildEnhancedMemoryContext(
    projectId: string
): Promise<MemoryContextResult> {
    const memory = await getEnhancedMemory(projectId, "");
    
    const parts: string[] = [];
    
    if (memory.summary) {
        parts.push(`## Project Memory\n${memory.summary}`);
    }
    
    if (memory.techStack.length > 0) {
        parts.push(`\n### Tech Stack: ${memory.techStack.join(", ")}`);
    }
    
    // High priority decisions first
    const highPriorityDecisions = memory.decisions.filter(d => d.priority === 'high' && d.stillRelevant);
    if (highPriorityDecisions.length > 0) {
        parts.push(`\n### Important Decisions (High Priority):`);
        for (const d of highPriorityDecisions.slice(0, 5)) {
            parts.push(`- **${d.decision}**: ${d.reason}`);
        }
    }
    
    // Other recent decisions
    const otherDecisions = memory.decisions
        .filter(d => d.priority !== 'high' && d.stillRelevant)
        .slice(-5);
    if (otherDecisions.length > 0) {
        parts.push(`\n### Recent Decisions:`);
        for (const d of otherDecisions) {
            parts.push(`- ${d.decision}: ${d.reason}`);
        }
    }
    
    // Recent context
    const recentContext = memory.context.slice(-5);
    if (recentContext.length > 0) {
        parts.push(`\n### Important Context:`);
        for (const c of recentContext) {
            parts.push(`- ${c.key}: ${c.value}`);
        }
    }
    
    // Recent events
    const recentEvents = memory.events.slice(-3);
    if (recentEvents.length > 0) {
        parts.push(`\n### Recent Activity:`);
        for (const e of recentEvents) {
            parts.push(`- ${e.summary}`);
        }
    }
    
    return {
        summary: memory.summary,
        decisions: memory.decisions,
        techStack: memory.techStack,
        context: memory.context,
        recentEvents: memory.events.slice(-10),
        formatted: parts.join('\n'),
    };
}

/**
 * Process AI response to extract and store important information
 */
export async function processAIResponse(
    projectId: string,
    orgId: string,
    userMessage: string,
    aiResponse: string
): Promise<{
    detectedEvents: ImportantEvent[];
    shouldSummarize: boolean;
}> {
    // Detect events from the conversation
    const detectedEvents = detectEventsFromResponse(projectId, aiResponse, userMessage);
    
    // Check if we should summarize
    const needsSummary = await shouldSummarize(projectId);
    
    return {
        detectedEvents,
        shouldSummarize: needsSummary,
    };
}

// Backward compatibility exports
export { captureEvent, detectEventsFromResponse };

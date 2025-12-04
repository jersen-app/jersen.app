/**
 * Planning Tool
 * 
 * Allows the AI to plan complex multi-file changes before implementing them.
 * This improves consistency and reduces errors for large features.
 */

import { z } from "zod";
import { tool } from "ai";

// Schema for file plans
export const FilePlanSchema = z.object({
    path: z.string().describe("File path relative to project root"),
    purpose: z.string().describe("What this file does"),
    dependencies: z.array(z.string()).optional().describe("Other files this depends on"),
});

export const ChangePlanSchema = z.object({
    path: z.string().describe("File path to modify"),
    changes: z.string().describe("Description of changes to make"),
    affectedExports: z.array(z.string()).optional().describe("Exports that will change"),
});

export const FeaturePlanSchema = z.object({
    feature: z.string().describe("Name/description of the feature"),
    overview: z.string().describe("High-level description of what will be implemented"),
    filesToCreate: z.array(FilePlanSchema).describe("New files to create"),
    filesToModify: z.array(ChangePlanSchema).describe("Existing files to modify"),
    filesToDelete: z.array(z.string()).optional().describe("Files to remove"),
    dependencies: z.array(z.string()).optional().describe("NPM packages needed"),
    order: z.array(z.string()).describe("Order to create/modify files for proper dependencies"),
});

export type FilePlan = z.infer<typeof FilePlanSchema>;
export type ChangePlan = z.infer<typeof ChangePlanSchema>;
export type FeaturePlan = z.infer<typeof FeaturePlanSchema>;

// Store for current plans (in-memory, per-request)
const planStore = new Map<string, FeaturePlan>();

/**
 * Store a plan for a project
 */
export function storePlan(projectId: string, plan: FeaturePlan): void {
    planStore.set(projectId, plan);
}

/**
 * Get the current plan for a project
 */
export function getCurrentPlan(projectId: string): FeaturePlan | undefined {
    return planStore.get(projectId);
}

/**
 * Clear the plan for a project
 */
export function clearPlan(projectId: string): void {
    planStore.delete(projectId);
}

/**
 * Validate a plan for consistency
 */
export function validatePlan(
    plan: FeaturePlan,
    existingFiles: string[]
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for files to create that already exist
    for (const file of plan.filesToCreate) {
        if (existingFiles.includes(file.path)) {
            errors.push(`File "${file.path}" already exists - should be in filesToModify`);
        }
    }
    
    // Check for files to modify that don't exist
    for (const change of plan.filesToModify) {
        if (!existingFiles.includes(change.path)) {
            errors.push(`File "${change.path}" doesn't exist - should be in filesToCreate`);
        }
    }
    
    // Check for files to delete that don't exist
    if (plan.filesToDelete) {
        for (const path of plan.filesToDelete) {
            if (!existingFiles.includes(path)) {
                errors.push(`Cannot delete "${path}" - file doesn't exist`);
            }
        }
    }
    
    // Check order includes all files
    const allPaths = [
        ...plan.filesToCreate.map(f => f.path),
        ...plan.filesToModify.map(f => f.path),
    ];
    
    for (const path of allPaths) {
        if (!plan.order.includes(path)) {
            errors.push(`File "${path}" not included in order array`);
        }
    }
    
    // Check for circular dependencies
    const deps = new Map<string, string[]>();
    for (const file of plan.filesToCreate) {
        deps.set(file.path, file.dependencies || []);
    }
    
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    function hasCycle(path: string): boolean {
        if (visiting.has(path)) return true;
        if (visited.has(path)) return false;
        
        visiting.add(path);
        for (const dep of deps.get(path) || []) {
            if (hasCycle(dep)) return true;
        }
        visiting.delete(path);
        visited.add(path);
        return false;
    }
    
    for (const path of deps.keys()) {
        if (hasCycle(path)) {
            errors.push(`Circular dependency detected involving "${path}"`);
            break;
        }
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Format plan as readable text for AI context
 */
export function formatPlanAsContext(plan: FeaturePlan): string {
    const lines: string[] = [
        `## Current Implementation Plan: ${plan.feature}`,
        '',
        `**Overview:** ${plan.overview}`,
        '',
    ];
    
    if (plan.filesToCreate.length > 0) {
        lines.push('### Files to Create:');
        for (const file of plan.filesToCreate) {
            lines.push(`- **${file.path}**: ${file.purpose}`);
            if (file.dependencies?.length) {
                lines.push(`  - Depends on: ${file.dependencies.join(', ')}`);
            }
        }
        lines.push('');
    }
    
    if (plan.filesToModify.length > 0) {
        lines.push('### Files to Modify:');
        for (const change of plan.filesToModify) {
            lines.push(`- **${change.path}**: ${change.changes}`);
        }
        lines.push('');
    }
    
    if (plan.filesToDelete?.length) {
        lines.push('### Files to Delete:');
        for (const path of plan.filesToDelete) {
            lines.push(`- ${path}`);
        }
        lines.push('');
    }
    
    if (plan.dependencies?.length) {
        lines.push(`### Dependencies: ${plan.dependencies.join(', ')}`);
        lines.push('');
    }
    
    lines.push(`### Implementation Order: ${plan.order.join(' → ')}`);
    
    return lines.join('\n');
}

/**
 * Create the planning tool
 */
export function createPlanningTool(context: {
    projectId: string;
    existingFiles: string[];
    onPlanCreated?: (plan: FeaturePlan) => Promise<void>;
}) {
    return {
        planFeature: tool({
            description: `Plan a complex multi-file feature before implementing. After planning, you MUST immediately generate ALL files in the plan - do not stop between files. Generate everything in one response.`,
            inputSchema: FeaturePlanSchema,
            execute: async (plan: FeaturePlan) => {
                // Validate the plan
                const validation = validatePlan(plan, context.existingFiles);
                
                if (!validation.valid) {
                    return {
                        success: false as const,
                        errors: validation.errors,
                        suggestion: "Fix the errors above and try planning again.",
                    };
                }
                
                // Store the plan
                storePlan(context.projectId, plan);
                
                // Callback for persistence
                if (context.onPlanCreated) {
                    await context.onPlanCreated(plan);
                }
                
                return {
                    success: true as const,
                    plan: {
                        feature: plan.feature,
                        totalFiles: plan.filesToCreate.length + plan.filesToModify.length,
                        order: plan.order,
                    },
                    instruction: `⚠️ CRITICAL: Now generate ALL ${plan.order.length} files in ONE response. Do NOT stop after each file. Generate: ${plan.order.join(', ')}`,
                };
            },
        }),
        
        getPlan: tool({
            description: "Get the current implementation plan if one exists.",
            inputSchema: z.object({}),
            execute: async (): Promise<{ hasPlan: boolean; plan?: string }> => {
                const plan = getCurrentPlan(context.projectId);
                
                if (!plan) {
                    return { hasPlan: false };
                }
                
                return {
                    hasPlan: true,
                    plan: formatPlanAsContext(plan),
                };
            },
        }),
        
        markPlanComplete: tool({
            description: "Mark a file in the plan as completed. Call this ONLY after generating a file, then IMMEDIATELY continue generating the next file. Do NOT stop after calling this - always continue until ALL files are generated.",
            inputSchema: z.object({
                path: z.string().describe("Path of the completed file"),
            }),
            execute: async ({ path }: { path: string }) => {
                const plan = getCurrentPlan(context.projectId);
                
                if (!plan) {
                    return { success: false as const, error: "No active plan" };
                }
                
                const index = plan.order.indexOf(path);
                if (index === -1) {
                    return { success: false as const, error: `"${path}" not in plan` };
                }
                
                const completed = plan.order.slice(0, index + 1);
                const remaining = plan.order.slice(index + 1);
                
                if (remaining.length > 0) {
                    return {
                        success: true as const,
                        completed,
                        remaining,
                        nextFile: remaining[0],
                        isComplete: false,
                        instruction: `⚠️ DO NOT STOP! Immediately generate: ${remaining[0]}. ${remaining.length} file(s) remaining: ${remaining.join(', ')}`,
                    };
                }
                
                return {
                    success: true as const,
                    completed,
                    remaining: [],
                    nextFile: null,
                    isComplete: true,
                    instruction: "All files generated successfully!",
                };
            },
        }),
    };
}

export type PlanningTools = ReturnType<typeof createPlanningTool>;

/**
 * Component Discovery Tool
 * 
 * Finds existing reusable components, hooks, and utilities in the project.
 * Helps the AI avoid recreating existing code.
 */

import { z } from "zod";
import { tool } from "ai";

// Component types
export type ComponentType = 'component' | 'hook' | 'utility' | 'page' | 'layout' | 'api';

export interface DiscoveredComponent {
    path: string;
    name: string;
    type: ComponentType;
    exports: string[];
    description?: string;
    props?: string[];
    dependencies?: string[];
}

export interface DiscoveryContext {
    files: Array<{ path: string; content: string }>;
}

/**
 * Extract exports from a TypeScript/TSX file
 */
export function extractExports(content: string): string[] {
    const exports: string[] = [];
    
    // Named exports: export function X, export const X, export class X, export interface X
    const namedExportRegex = /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
        exports.push(match[1]);
    }
    
    // Export default function X or export default class X
    const defaultExportRegex = /export\s+default\s+(?:async\s+)?(?:function|class)\s+(\w+)/g;
    while ((match = defaultExportRegex.exec(content)) !== null) {
        exports.push(`default:${match[1]}`);
    }
    
    // Export default X (variable)
    const defaultVarRegex = /export\s+default\s+(\w+)/g;
    while ((match = defaultVarRegex.exec(content)) !== null) {
        if (!exports.includes(`default:${match[1]}`)) {
            exports.push(`default:${match[1]}`);
        }
    }
    
    // Re-exports: export { X, Y } from
    const reexportRegex = /export\s*\{([^}]+)\}\s*from/g;
    while ((match = reexportRegex.exec(content)) !== null) {
        const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
        exports.push(...names.filter(n => n));
    }
    
    return [...new Set(exports)];
}

/**
 * Extract props from a React component
 */
export function extractProps(content: string, componentName: string): string[] {
    const props: string[] = [];
    
    // Look for interface/type for props
    const propsPatterns = [
        new RegExp(`interface\\s+${componentName}Props\\s*\\{([^}]+)\\}`, 's'),
        new RegExp(`type\\s+${componentName}Props\\s*=\\s*\\{([^}]+)\\}`, 's'),
        new RegExp(`interface\\s+Props\\s*\\{([^}]+)\\}`, 's'),
        new RegExp(`type\\s+Props\\s*=\\s*\\{([^}]+)\\}`, 's'),
    ];
    
    for (const pattern of propsPatterns) {
        const match = content.match(pattern);
        if (match) {
            const propsContent = match[1];
            // Extract prop names
            const propLines = propsContent.split('\n');
            for (const line of propLines) {
                const propMatch = line.match(/^\s*(\w+)\??:\s*(.+?)[;,]?\s*$/);
                if (propMatch) {
                    props.push(`${propMatch[1]}: ${propMatch[2].trim()}`);
                }
            }
            break;
        }
    }
    
    // Also check destructured props in function signature
    const funcSigMatch = content.match(
        new RegExp(`function\\s+${componentName}\\s*\\(\\s*\\{([^}]+)\\}`, 's')
    );
    if (funcSigMatch && props.length === 0) {
        const destructured = funcSigMatch[1].split(',').map(p => p.trim());
        props.push(...destructured.filter(p => p));
    }
    
    return props;
}

/**
 * Extract dependencies/imports from a file
 */
export function extractDependencies(content: string): string[] {
    const deps: string[] = [];
    
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        // Only include local imports
        if (importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('@/')) {
            deps.push(importPath);
        }
    }
    
    return deps;
}

/**
 * Determine component type from path and content
 */
export function determineComponentType(path: string, content: string): ComponentType {
    if (path.includes('/api/') && path.endsWith('route.ts')) return 'api';
    if (path.endsWith('layout.tsx')) return 'layout';
    if (path.endsWith('page.tsx')) return 'page';
    if (path.startsWith('hooks/') || path.includes('/hooks/') || path.match(/use[A-Z]/)) return 'hook';
    if (path.startsWith('lib/') || path.includes('/lib/') || path.includes('/utils/')) return 'utility';
    return 'component';
}

/**
 * Generate a description for a component based on its name and content
 */
export function generateDescription(name: string, content: string, type: ComponentType): string {
    // Try to find a comment at the top of the file
    const commentMatch = content.match(/^\/\*\*\s*([\s\S]*?)\s*\*\//);
    if (commentMatch) {
        const firstLine = commentMatch[1].split('\n')[0].replace(/^\s*\*\s*/, '').trim();
        if (firstLine && firstLine.length > 10) {
            return firstLine;
        }
    }
    
    // Generate based on name and type
    const words = name.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    
    switch (type) {
        case 'hook':
            return `React hook for ${words.replace('use ', '')}`;
        case 'api':
            return `API route handler for ${words}`;
        case 'layout':
            return `Layout component for ${words.replace(' layout', '')} section`;
        case 'page':
            return `Page component for ${words.replace(' page', '')}`;
        case 'utility':
            return `Utility function for ${words}`;
        default:
            return `UI component for ${words}`;
    }
}

/**
 * Discover all components in the project
 */
export function discoverComponents(
    files: Array<{ path: string; content: string }>
): DiscoveredComponent[] {
    const components: DiscoveredComponent[] = [];
    
    for (const file of files) {
        // Skip non-TS/TSX files
        if (!file.path.match(/\.(tsx?|jsx?)$/)) continue;
        
        // Skip test files
        if (file.path.includes('.test.') || file.path.includes('.spec.')) continue;
        
        // Skip config files
        if (file.path.match(/\.(config|d)\./)) continue;
        
        const exports = extractExports(file.content);
        if (exports.length === 0) continue;
        
        const type = determineComponentType(file.path, file.content);
        
        // Get the main export name
        const defaultExport = exports.find(e => e.startsWith('default:'));
        const mainName = defaultExport 
            ? defaultExport.replace('default:', '')
            : exports[0];
        
        const component: DiscoveredComponent = {
            path: file.path,
            name: mainName,
            type,
            exports: exports.filter(e => !e.startsWith('default:')),
            description: generateDescription(mainName, file.content, type),
            dependencies: extractDependencies(file.content),
        };
        
        // Extract props for components
        if (type === 'component') {
            component.props = extractProps(file.content, mainName);
        }
        
        components.push(component);
    }
    
    return components;
}

/**
 * Find components by type
 */
export function findByType(
    components: DiscoveredComponent[],
    type: ComponentType | 'all'
): DiscoveredComponent[] {
    if (type === 'all') return components;
    return components.filter(c => c.type === type);
}

/**
 * Find components by name (fuzzy match)
 */
export function findByName(
    components: DiscoveredComponent[],
    query: string
): DiscoveredComponent[] {
    const lowerQuery = query.toLowerCase();
    
    return components.filter(c => {
        const lowerName = c.name.toLowerCase();
        // Exact match
        if (lowerName === lowerQuery) return true;
        // Partial match
        if (lowerName.includes(lowerQuery)) return true;
        // Acronym match (e.g., "auth" matches "AuthProvider")
        if (lowerName.startsWith(lowerQuery)) return true;
        // Path match
        if (c.path.toLowerCase().includes(lowerQuery)) return true;
        
        return false;
    }).sort((a, b) => {
        // Exact matches first
        const aExact = a.name.toLowerCase() === lowerQuery;
        const bExact = b.name.toLowerCase() === lowerQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.name.localeCompare(b.name);
    });
}

/**
 * Find components that might be relevant to a feature
 */
export function findRelevantComponents(
    components: DiscoveredComponent[],
    feature: string
): DiscoveredComponent[] {
    const keywords = feature.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);
    
    return components.filter(c => {
        const searchText = `${c.name} ${c.description || ''} ${c.path}`.toLowerCase();
        return keywords.some(k => searchText.includes(k));
    });
}

/**
 * Format component for display
 */
export function formatComponent(component: DiscoveredComponent): string {
    const lines = [
        `**${component.name}** (${component.type})`,
        `Path: ${component.path}`,
    ];
    
    if (component.description) {
        lines.push(`Description: ${component.description}`);
    }
    
    if (component.exports.length > 0) {
        lines.push(`Exports: ${component.exports.join(', ')}`);
    }
    
    if (component.props && component.props.length > 0) {
        lines.push(`Props: ${component.props.slice(0, 5).join(', ')}${component.props.length > 5 ? '...' : ''}`);
    }
    
    return lines.join('\n');
}

/**
 * Create the discovery tool
 */
export function createDiscoveryTool(context: DiscoveryContext) {
    // Pre-discover all components
    const allComponents = discoverComponents(context.files);
    
    return {
        discoverComponents: tool({
            description: `Find existing reusable components in the project.
Use BEFORE creating new UI components to avoid duplication.
Can filter by type: component, hook, utility, page, layout, api`,
            inputSchema: z.object({
                type: z.enum(['component', 'hook', 'utility', 'page', 'layout', 'api', 'all'])
                    .describe('Type of component to find'),
            }),
            execute: async ({ type }: { type: ComponentType | 'all' }): Promise<{
                count: number;
                components: Array<{
                    name: string;
                    path: string;
                    type: ComponentType;
                    exports: string[];
                }>;
            }> => {
                const found = findByType(allComponents, type);
                
                return {
                    count: found.length,
                    components: found.map(c => ({
                        name: c.name,
                        path: c.path,
                        type: c.type,
                        exports: c.exports,
                    })),
                };
            },
        }),
        
        searchComponents: tool({
            description: `Search for components by name.
Use when you need to find a specific component or related components.`,
            inputSchema: z.object({
                query: z.string().describe('Name or keyword to search for'),
            }),
            execute: async ({ query }: { query: string }): Promise<{
                count: number;
                matches: Array<{
                    name: string;
                    path: string;
                    type: ComponentType;
                    description: string | undefined;
                    props: string[] | undefined;
                }>;
            }> => {
                const matches = findByName(allComponents, query);
                
                return {
                    count: matches.length,
                    matches: matches.slice(0, 10).map(c => ({
                        name: c.name,
                        path: c.path,
                        type: c.type,
                        description: c.description,
                        props: c.props,
                    })),
                };
            },
        }),
        
        findRelated: tool({
            description: `Find components that might be related to a feature you're implementing.
Use when starting a new feature to see what already exists.`,
            inputSchema: z.object({
                feature: z.string().describe('Description of the feature (e.g., "user authentication" or "todo list")'),
            }),
            execute: async ({ feature }: { feature: string }): Promise<{
                count: number;
                relevant: Array<{
                    name: string;
                    path: string;
                    type: ComponentType;
                    description: string | undefined;
                }>;
                suggestion: string;
            }> => {
                const relevant = findRelevantComponents(allComponents, feature);
                
                let suggestion = '';
                if (relevant.length > 0) {
                    suggestion = `Found ${relevant.length} existing component(s) that might be useful. Consider using or extending them instead of creating new ones.`;
                } else {
                    suggestion = `No existing components found for "${feature}". You may need to create new components.`;
                }
                
                return {
                    count: relevant.length,
                    relevant: relevant.slice(0, 10).map(c => ({
                        name: c.name,
                        path: c.path,
                        type: c.type,
                        description: c.description,
                    })),
                    suggestion,
                };
            },
        }),
        
        getComponentDetails: tool({
            description: `Get detailed information about a specific component, including its props and dependencies.`,
            inputSchema: z.object({
                path: z.string().describe('Path to the component file'),
            }),
            execute: async ({ path }: { path: string }): Promise<{
                found: boolean;
                component?: {
                    name: string;
                    path: string;
                    type: ComponentType;
                    exports: string[];
                    props: string[] | undefined;
                    dependencies: string[] | undefined;
                    description: string | undefined;
                };
            }> => {
                const component = allComponents.find(c => c.path === path);
                
                if (!component) {
                    return { found: false };
                }
                
                return {
                    found: true,
                    component: {
                        name: component.name,
                        path: component.path,
                        type: component.type,
                        exports: component.exports,
                        props: component.props,
                        dependencies: component.dependencies,
                        description: component.description,
                    },
                };
            },
        }),
    };
}

export type DiscoveryTools = ReturnType<typeof createDiscoveryTool>;

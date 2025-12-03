/**
 * Template System
 * 
 * Pre-built templates for common Next.js patterns.
 * Helps AI generate consistent, production-ready code.
 */

import { z } from 'zod';
import { tool } from 'ai';
import {
  Template,
  TemplateCategory,
  TemplateResult,
  TemplateMatch,
  TemplateVariable
} from './types';
import { crudTemplates } from './crud';
import { authTemplates } from './auth';
import { componentTemplates } from './components';

// Export types
export * from './types';

// All available templates
export const templates: Template[] = [
  ...crudTemplates,
  ...authTemplates,
  ...componentTemplates,
];

/**
 * Find templates matching a user query
 */
export function findMatchingTemplates(query: string): TemplateMatch[] {
  const queryLower = query.toLowerCase();
  const matches: TemplateMatch[] = [];
  
  // Keywords for each category
  const categoryKeywords: Record<TemplateCategory, string[]> = {
    crud: ['crud', 'create', 'read', 'update', 'delete', 'list', 'table', 'edit', 'manage'],
    auth: ['auth', 'login', 'protect', 'permission', 'role', 'access', 'session', 'user'],
    api: ['api', 'endpoint', 'route', 'rest', 'restful', 'backend'],
    component: ['component', 'reusable', 'ui', 'widget'],
    page: ['page', 'route', 'screen', 'view'],
    form: ['form', 'input', 'modal', 'dialog', 'submit'],
    'data-fetching': ['fetch', 'data', 'query', 'load', 'server'],
    'file-upload': ['upload', 'file', 'image', 'attachment', 'drag', 'drop'],
    realtime: ['realtime', 'websocket', 'live', 'stream', 'subscribe'],
  };
  
  for (const template of templates) {
    let confidence = 0;
    const matchedKeywords: string[] = [];
    
    // Check template name and description
    if (queryLower.includes(template.name.toLowerCase())) {
      confidence += 30;
      matchedKeywords.push(template.name);
    }
    
    const descWords = template.description.toLowerCase().split(/\s+/);
    for (const word of descWords) {
      if (word.length > 3 && queryLower.includes(word)) {
        confidence += 5;
        matchedKeywords.push(word);
      }
    }
    
    // Check category keywords
    const catKeywords = categoryKeywords[template.category] || [];
    for (const keyword of catKeywords) {
      if (queryLower.includes(keyword)) {
        confidence += 15;
        matchedKeywords.push(keyword);
      }
    }
    
    // Check template ID
    if (queryLower.includes(template.id.replace(/-/g, ' '))) {
      confidence += 20;
      matchedKeywords.push(template.id);
    }
    
    if (confidence > 0) {
      matches.push({
        template,
        confidence: Math.min(100, confidence),
        matchedKeywords: [...new Set(matchedKeywords)],
      });
    }
  }
  
  // Sort by confidence
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): Template | undefined {
  return templates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return templates.filter(t => t.category === category);
}

/**
 * Apply variables to template content
 */
function applyVariables(
  content: string,
  variables: Record<string, string | string[]>
): string {
  let result = content;
  
  for (const [key, value] of Object.entries(variables)) {
    // Handle array values (for {{#fields}}...{{/fields}} blocks)
    if (Array.isArray(value)) {
      const blockRegex = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, 'g');
      result = result.replace(blockRegex, (_, blockContent) => {
        return value.map(item => {
          if (typeof item === 'object') {
            let itemContent = blockContent;
            for (const [itemKey, itemValue] of Object.entries(item as Record<string, string>)) {
              itemContent = itemContent.replace(
                new RegExp(`\\{\\{${itemKey}\\}\\}`, 'g'),
                String(itemValue)
              );
            }
            return itemContent;
          }
          return blockContent.replace(/\{\{value\}\}/g, String(item));
        }).join('\n');
      });
    } else {
      // Handle simple string values
      // {{variableName}} - lowercase
      result = result.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        value
      );
      
      // {{VariableName}} - PascalCase
      const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
      const pascalValue = String(value).charAt(0).toUpperCase() + String(value).slice(1);
      result = result.replace(
        new RegExp(`\\{\\{${pascalKey}\\}\\}`, 'g'),
        pascalValue
      );
    }
  }
  
  return result;
}

/**
 * Generate files from a template
 */
export function generateFromTemplate(
  templateId: string,
  variables: Record<string, string | string[]>
): TemplateResult {
  const template = getTemplateById(templateId);
  
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  // Validate required variables
  for (const variable of template.variables) {
    if (variable.required && !variables[variable.name]) {
      throw new Error(`Missing required variable: ${variable.name}`);
    }
  }
  
  // Apply default values
  const finalVariables = { ...variables };
  for (const variable of template.variables) {
    if (finalVariables[variable.name] === undefined && variable.defaultValue) {
      finalVariables[variable.name] = variable.defaultValue;
    }
  }
  
  // Generate files
  const files = template.files.map(file => ({
    path: applyVariables(file.path, finalVariables),
    content: applyVariables(file.content, finalVariables),
  }));
  
  return {
    files,
    dependencies: template.dependencies || [],
    instructions: template.instructions ? [template.instructions] : [],
  };
}

/**
 * Format template info for AI context
 */
export function formatTemplateForContext(template: Template): string {
  const variableList = template.variables
    .map(v => `  - ${v.name}: ${v.description}${v.required ? ' (required)' : ''}`)
    .join('\n');
  
  const fileList = template.files
    .map(f => `  - ${f.path}: ${f.description}`)
    .join('\n');
  
  return `Template: ${template.name} (${template.id})
Category: ${template.category}
Description: ${template.description}
Variables:
${variableList}
Files Generated:
${fileList}
${template.dependencies?.length ? `Dependencies: ${template.dependencies.join(', ')}` : ''}`;
}

/**
 * Get all available templates as context for AI
 */
export function getTemplatesContext(): string {
  const byCategory = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, Template[]>);
  
  const sections = Object.entries(byCategory).map(([category, temps]) => {
    const tempList = temps.map(t => `  - ${t.id}: ${t.description}`).join('\n');
    return `${category.toUpperCase()}:\n${tempList}`;
  });
  
  return `AVAILABLE TEMPLATES:
${sections.join('\n\n')}

Use the template tool to generate code from these templates.`;
}

/**
 * Create template tool for AI
 */
export function createTemplateTool() {
  return {
    listTemplates: tool({
      description: 'List available templates, optionally filtered by category or search query',
      inputSchema: z.object({
        category: z.enum([
          'crud', 'auth', 'api', 'component', 'page', 'form', 'data-fetching', 'file-upload', 'realtime'
        ]).optional().describe('Filter by category'),
        query: z.string().optional().describe('Search query to find relevant templates'),
      }),
      execute: async ({ category, query }) => {
        let results: Template[];
        
        if (query) {
          const matches = findMatchingTemplates(query);
          results = matches.map(m => m.template);
        } else if (category) {
          results = getTemplatesByCategory(category);
        } else {
          results = templates;
        }
        
        return {
          templates: results.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            variables: t.variables.map(v => ({
              name: v.name,
              description: v.description,
              required: v.required,
              type: v.type,
            })),
          })),
        };
      },
    }),
    
    useTemplate: tool({
      description: 'Generate files from a template with the provided variables',
      inputSchema: z.object({
        templateId: z.string().describe('ID of the template to use'),
        variables: z.record(z.union([z.string(), z.array(z.string())]))
          .describe('Variables to apply to the template'),
      }),
      execute: async ({ templateId, variables }) => {
        try {
          const result = generateFromTemplate(templateId, variables);
          return {
            success: true,
            files: result.files.map(f => ({
              path: f.path,
              contentPreview: f.content.slice(0, 500) + (f.content.length > 500 ? '...' : ''),
            })),
            dependencies: result.dependencies,
            instructions: result.instructions,
            fullFiles: result.files, // AI can use this to write files
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate from template',
          };
        }
      },
    }),
    
    getTemplateDetails: tool({
      description: 'Get detailed information about a specific template',
      inputSchema: z.object({
        templateId: z.string().describe('ID of the template to get details for'),
      }),
      execute: async ({ templateId }) => {
        const template = getTemplateById(templateId);
        
        if (!template) {
          return { error: `Template not found: ${templateId}` };
        }
        
        return {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          variables: template.variables,
          files: template.files.map(f => ({
            path: f.path,
            description: f.description,
          })),
          dependencies: template.dependencies,
          instructions: template.instructions,
        };
      },
    }),
  };
}

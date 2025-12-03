/**
 * Template Types
 * 
 * Type definitions for the project template system.
 */

export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
  required: boolean;
  type: 'string' | 'boolean' | 'array' | 'enum';
  options?: string[]; // For enum type
}

export interface TemplateFile {
  path: string; // Path pattern with variables, e.g., "app/{{name}}/page.tsx"
  content: string;
  description: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  variables: TemplateVariable[];
  files: TemplateFile[];
  dependencies?: string[]; // npm packages needed
  instructions?: string; // Additional setup instructions
}

export type TemplateCategory = 
  | 'crud'
  | 'auth'
  | 'api'
  | 'component'
  | 'page'
  | 'form'
  | 'data-fetching'
  | 'file-upload'
  | 'realtime';

export interface TemplateResult {
  files: Array<{
    path: string;
    content: string;
  }>;
  dependencies: string[];
  instructions: string[];
}

export interface TemplateMatch {
  template: Template;
  confidence: number;
  matchedKeywords: string[];
}

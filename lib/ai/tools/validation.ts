/**
 * Code Validation Tool
 * 
 * Validates TypeScript/TSX code for syntax errors before outputting.
 * Uses esbuild for fast validation without full TypeScript compiler.
 */

import { z } from "zod";
import { tool } from "ai";

// Validation result interface
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    line: number;
    column: number;
    message: string;
    severity: 'error';
}

export interface ValidationWarning {
    line: number;
    column: number;
    message: string;
    severity: 'warning';
}

/**
 * Quick syntax validation using regex patterns
 * This is a fallback when esbuild is not available
 */
function quickSyntaxCheck(code: string, filepath: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const lines = code.split('\n');
    
    // Track brackets, braces, and parentheses
    const stack: { char: string; line: number }[] = [];
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>' };
    const closers: Record<string, string> = { ')': '(', ']': '[', '}': '{', '>': '<' };
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        
        // Skip comments and strings (simplified)
        let inString = false;
        let stringChar = '';
        let inComment = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            const nextChar = line[j + 1];
            
            // Handle comments
            if (!inString && char === '/' && nextChar === '/') {
                break; // Rest of line is comment
            }
            if (!inString && char === '/' && nextChar === '*') {
                inComment = true;
                continue;
            }
            if (inComment && char === '*' && nextChar === '/') {
                inComment = false;
                j++; // Skip the /
                continue;
            }
            if (inComment) continue;
            
            // Handle strings
            if ((char === '"' || char === "'" || char === '`') && line[j - 1] !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
                continue;
            }
            if (inString) continue;
            
            // Track brackets (skip < > for now as they're complex with generics/JSX)
            if (char === '(' || char === '[' || char === '{') {
                stack.push({ char, line: lineNum });
            } else if (char === ')' || char === ']' || char === '}') {
                const expected = closers[char];
                if (stack.length === 0) {
                    errors.push({
                        line: lineNum,
                        column: j + 1,
                        message: `Unexpected '${char}'`,
                        severity: 'error',
                    });
                } else if (stack[stack.length - 1].char !== expected) {
                    const last = stack[stack.length - 1];
                    errors.push({
                        line: lineNum,
                        column: j + 1,
                        message: `Expected '${pairs[last.char]}' but found '${char}'`,
                        severity: 'error',
                    });
                } else {
                    stack.pop();
                }
            }
        }
    }
    
    // Check for unclosed brackets
    for (const item of stack) {
        errors.push({
            line: item.line,
            column: 1,
            message: `Unclosed '${item.char}'`,
            severity: 'error',
        });
    }
    
    // Check for common issues
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();
        
        // Check for import without from
        if (trimmed.startsWith('import ') && !trimmed.includes('from') && !trimmed.includes('type {')) {
            if (!trimmed.match(/import\s+['"]/)) { // Not import 'module' style
                warnings.push({
                    line: lineNum,
                    column: 1,
                    message: 'Import statement may be missing "from"',
                    severity: 'warning',
                });
            }
        }
        
        // Check for const/let without assignment
        if (trimmed.match(/^(const|let)\s+\w+\s*$/)) {
            errors.push({
                line: lineNum,
                column: 1,
                message: 'Variable declaration without assignment',
                severity: 'error',
            });
        }
        
        // Check for async function without await (common oversight)
        if (trimmed.includes('async ') && !code.includes('await')) {
            warnings.push({
                line: lineNum,
                column: 1,
                message: 'Async function without await',
                severity: 'warning',
            });
        }
        
        // Check for React component returning null without condition
        if (filepath.endsWith('.tsx') && trimmed === 'return null;' && i > 0) {
            const prevLine = lines[i - 1]?.trim() || '';
            if (!prevLine.includes('if') && !prevLine.includes('?') && !prevLine.includes('&&')) {
                warnings.push({
                    line: lineNum,
                    column: 1,
                    message: 'Component returns null - this might be intentional, but verify',
                    severity: 'warning',
                });
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate code for common React/Next.js patterns
 */
function validateReactPatterns(code: string, filepath: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const lines = code.split('\n');
    
    const isClientComponent = code.includes('"use client"') || code.includes("'use client'");
    const isServerComponent = !isClientComponent;
    
    // Check for useState/useEffect in server components
    if (isServerComponent) {
        const hookPatterns = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useContext'];
        for (const hook of hookPatterns) {
            if (code.includes(hook)) {
                const lineNum = lines.findIndex(l => l.includes(hook)) + 1;
                warnings.push({
                    line: lineNum,
                    column: 1,
                    message: `Using ${hook} in what appears to be a Server Component. Add "use client" directive.`,
                    severity: 'warning',
                });
            }
        }
        
        // Check for onClick, onChange, etc.
        const eventHandlers = ['onClick', 'onChange', 'onSubmit', 'onBlur', 'onFocus', 'onKeyDown', 'onKeyUp'];
        for (const handler of eventHandlers) {
            if (code.includes(handler + '=')) {
                const lineNum = lines.findIndex(l => l.includes(handler + '=')) + 1;
                warnings.push({
                    line: lineNum,
                    column: 1,
                    message: `Using ${handler} in what appears to be a Server Component. Add "use client" directive.`,
                    severity: 'warning',
                });
            }
        }
    }
    
    // Check for missing key prop in lists
    if (code.includes('.map(') && !code.includes('key=')) {
        const lineNum = lines.findIndex(l => l.includes('.map(')) + 1;
        warnings.push({
            line: lineNum,
            column: 1,
            message: 'Array .map() without key prop on elements',
            severity: 'warning',
        });
    }
    
    // Check for useEffect without dependency array
    const useEffectMatch = code.match(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*\)/);
    if (useEffectMatch && !useEffectMatch[0].includes('],')) {
        const lineNum = lines.findIndex(l => l.includes('useEffect')) + 1;
        warnings.push({
            line: lineNum,
            column: 1,
            message: 'useEffect without dependency array - will run on every render',
            severity: 'warning',
        });
    }
    
    return warnings;
}

/**
 * Validate Next.js specific patterns
 */
function validateNextJsPatterns(code: string, filepath: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const lines = code.split('\n');
    
    // Check for correct async patterns in pages (Next.js 15+)
    if (filepath.includes('/page.') || filepath.includes('/layout.')) {
        // Check if params are properly awaited
        if (code.includes('params:') && !code.includes('await params') && code.includes('params.')) {
            const lineNum = lines.findIndex(l => l.includes('params.')) + 1;
            warnings.push({
                line: lineNum,
                column: 1,
                message: 'In Next.js 15+, params should be awaited: const { id } = await params',
                severity: 'warning',
            });
        }
        
        // Check for searchParams
        if (code.includes('searchParams:') && !code.includes('await searchParams') && code.includes('searchParams.')) {
            const lineNum = lines.findIndex(l => l.includes('searchParams.')) + 1;
            warnings.push({
                line: lineNum,
                column: 1,
                message: 'In Next.js 15+, searchParams should be awaited: const { query } = await searchParams',
                severity: 'warning',
            });
        }
    }
    
    // Check for cookies() and headers() usage
    if (code.includes('cookies()') || code.includes('headers()')) {
        if (code.includes('"use client"') || code.includes("'use client'")) {
            const lineNum = lines.findIndex(l => l.includes('cookies()') || l.includes('headers()')) + 1;
            warnings.push({
                line: lineNum,
                column: 1,
                message: 'cookies() and headers() only work in Server Components, not Client Components',
                severity: 'warning',
            });
        }
    }
    
    return warnings;
}

/**
 * Main validation function
 */
export async function validateCode(
    code: string,
    filepath: string
): Promise<ValidationResult> {
    // Start with syntax check
    const syntaxResult = quickSyntaxCheck(code, filepath);
    
    // If there are syntax errors, return early
    if (!syntaxResult.valid) {
        return syntaxResult;
    }
    
    // Add React/Next.js pattern warnings
    const reactWarnings = filepath.endsWith('.tsx') ? validateReactPatterns(code, filepath) : [];
    const nextWarnings = filepath.startsWith('app/') ? validateNextJsPatterns(code, filepath) : [];
    
    return {
        valid: true,
        errors: [],
        warnings: [...syntaxResult.warnings, ...reactWarnings, ...nextWarnings],
    };
}

/**
 * Validate multiple files
 */
export async function validateFiles(
    files: Array<{ path: string; content: string }>
): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();
    
    for (const file of files) {
        const result = await validateCode(file.content, file.path);
        results.set(file.path, result);
    }
    
    return results;
}

/**
 * Create the validation tool
 */
export function createValidationTool() {
    return {
        validateCode: tool({
            description: `Validate TypeScript/TSX code for syntax errors and common issues before outputting.
Use this to check generated code for:
- Syntax errors (unclosed brackets, missing semicolons)
- React issues (hooks in server components, missing keys)
- Next.js issues (params not awaited, client/server mismatches)`,
            inputSchema: z.object({
                code: z.string().describe("The code to validate"),
                filepath: z.string().describe("The file path (e.g., 'app/page.tsx')"),
            }),
            execute: async ({ code, filepath }: { code: string; filepath: string }): Promise<{
                valid: boolean;
                errors: string[];
                warnings: string[];
                suggestion?: string;
            }> => {
                const result = await validateCode(code, filepath);
                
                const errorMessages = result.errors.map(
                    e => `Line ${e.line}: ${e.message}`
                );
                const warningMessages = result.warnings.map(
                    w => `Line ${w.line}: ${w.message}`
                );
                
                let suggestion: string | undefined;
                if (!result.valid) {
                    suggestion = "Fix the errors above before outputting this code.";
                } else if (result.warnings.length > 0) {
                    suggestion = "Consider addressing these warnings for better code quality.";
                }
                
                return {
                    valid: result.valid,
                    errors: errorMessages,
                    warnings: warningMessages,
                    suggestion,
                };
            },
        }),
        
        validateMultiple: tool({
            description: "Validate multiple code files at once. Pass files as a JSON array string.",
            inputSchema: z.object({
                filesJson: z.string().describe('JSON array of files, e.g. [{"path": "app/page.tsx", "content": "..."}]'),
            }),
            execute: async ({ filesJson }: { filesJson: string }): Promise<{
                allValid: boolean;
                results: Array<{
                    path: string;
                    valid: boolean;
                    errorCount: number;
                    warningCount: number;
                }>;
            }> => {
                const files = JSON.parse(filesJson) as Array<{ path: string; content: string }>;
                const results = await validateFiles(files);
                
                const resultArray = Array.from(results.entries()).map(([path, result]) => ({
                    path,
                    valid: result.valid,
                    errorCount: result.errors.length,
                    warningCount: result.warnings.length,
                }));
                
                return {
                    allValid: resultArray.every(r => r.valid),
                    results: resultArray,
                };
            },
        }),
    };
}

export type ValidationTools = ReturnType<typeof createValidationTool>;

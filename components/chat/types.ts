export interface DiffBlock {
  search: string;
  replace: string;
}

export interface ParsedBlock {
  type: "text" | "code" | "file" | "diff" | "delete" | "install";
  content: string;
  language?: string;
  filename?: string;
  // For diff blocks
  diffBlocks?: DiffBlock[];
  isFullFile?: boolean;
  // For delete blocks
  isDelete?: boolean;
  // For install blocks
  packages?: string[];
}

export interface Attachment {
  id: string;
  type: "image" | "pdf";
  name: string;
  size: number;
  url: string; // base64 or blob URL
  file?: File;
}

// Tool call state during streaming
export interface ToolCall {
  id: string;
  toolName: string;
  args?: Record<string, unknown>;
  state: 'pending' | 'running' | 'complete';
  result?: unknown;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsedBlocks?: ParsedBlock[];
  files?: FileData[];
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  timestamp?: Date;
}

export interface FileData {
  path: string;
  content: string;
  // For tracking if this is an edit vs new file
  isEdit?: boolean;
  diffBlocks?: DiffBlock[];
  // For file deletion
  isDelete?: boolean;
}

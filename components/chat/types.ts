export interface DiffBlock {
  search: string;
  replace: string;
}

export interface ParsedBlock {
  type: "text" | "code" | "file" | "diff";
  content: string;
  language?: string;
  filename?: string;
  // For diff blocks
  diffBlocks?: DiffBlock[];
  isFullFile?: boolean;
}

export interface Attachment {
  id: string;
  type: "image" | "pdf";
  name: string;
  size: number;
  url: string; // base64 or blob URL
  file?: File;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsedBlocks?: ParsedBlock[];
  files?: FileData[];
  attachments?: Attachment[];
  timestamp?: Date;
}

export interface FileData {
  path: string;
  content: string;
  // For tracking if this is an edit vs new file
  isEdit?: boolean;
  diffBlocks?: DiffBlock[];
}

export interface ParsedBlock {
  type: "text" | "code" | "file";
  content: string;
  language?: string;
  filename?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsedBlocks?: ParsedBlock[];
  files?: { path: string; content: string }[];
  timestamp?: Date;
}

export interface FileData {
  path: string;
  content: string;
}

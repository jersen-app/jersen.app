// Main export
export { ChatInterface } from "./ChatInterface";

// Types
export type { Message, ParsedBlock, FileData, DiffBlock, Attachment, ToolCall } from "./types";

// Components (for custom usage)
export { MessageBubble } from "./MessageBubble";
export { MessageList } from "./MessageList";
export { ChatInput } from "./ChatInput";
export { FileBlock } from "./FileBlock";
export { CodeBlock } from "./CodeBlock";
export { MarkdownContent } from "./MarkdownContent";
export { StreamingIndicator } from "./StreamingIndicator";
export { EmptyState } from "./EmptyState";
export { DiffPreview } from "./DiffPreview";
export { ToolIndicator, ToolIndicatorCompact } from "./ToolIndicator";

// Utils
export { generateId, parseAIResponse } from "./utils";

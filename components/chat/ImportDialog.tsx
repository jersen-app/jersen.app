import { useState, useRef } from "react";
import { Upload, Loader2, FileUp, AlertCircle } from "lucide-react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ImportDialogProps {
  projectId: string;
  onImport?: () => void;
}

export function ImportDialog({ projectId, onImport }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setError("Please upload a .zip file");
      return;
    }

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/projects/${projectId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      console.log("Imported files:", data.fileCount);
      
      setIsOpen(false);
      if (onImport) onImport();
      // Reload to show new files
      window.location.reload();
    } catch (err) {
      console.error("Import error:", err);
      setError("Failed to import project. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    // Check if it's a single zip file
    if (items.length === 1 && items[0].kind === 'file') {
      const file = items[0].getAsFile();
      if (file && file.name.endsWith('.zip')) {
        handleFile(file);
        return;
      }
    }

    // Handle folder drop
    setIsUploading(true);
    setError(null);

    try {
      const zip = new JSZip();
      let fileCount = 0;

      // Helper to traverse file system entries
      const traverseFileTree = async (item: any, path = "") => {
        if (item.isFile) {
          const file = await new Promise<File>((resolve, reject) => {
            item.file(resolve, reject);
          });
          
          // Ignore system files
          if (file.name === '.DS_Store' || file.name.startsWith('._')) return;
          
          zip.file(path + file.name, file);
          fileCount++;
        } else if (item.isDirectory) {
          // Ignore node_modules, .next, .git
          if (['node_modules', '.next', '.git', '.vscode', 'dist', 'build'].includes(item.name)) {
            return;
          }

          const dirReader = item.createReader();
          const entries = await new Promise<any[]>((resolve, reject) => {
            const allEntries: any[] = [];
            const read = () => {
              dirReader.readEntries((results: any[]) => {
                if (results.length === 0) {
                  resolve(allEntries);
                } else {
                  allEntries.push(...results);
                  read();
                }
              }, reject);
            };
            read();
          });

          for (const entry of entries) {
            await traverseFileTree(entry, path + item.name + "/");
          }
        }
      };

      // Process all dropped items
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          await traverseFileTree(item);
        }
      }

      if (fileCount === 0) {
        throw new Error("No valid files found to import");
      }

      console.log(`Zipped ${fileCount} files from dropped folder`);
      const content = await zip.generateAsync({ type: "blob" });
      const zipFile = new File([content], "project.zip", { type: "application/zip" });

      await handleFile(zipFile);

    } catch (err) {
      console.error("Folder import error:", err);
      setError("Failed to process folder. Please try again.");
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Upload className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Import Project (ZIP)</TooltipContent>
      </Tooltip>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Project</DialogTitle>
          <DialogDescription>
            Upload a .zip file to replace the current project. 
            A backup snapshot will be created automatically before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/10" : "hover:bg-muted/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Importing project files...</p>
              </>
            ) : (
              <>
                <div className={`p-4 rounded-full ${isDragging ? "bg-primary/20" : "bg-muted"}`}>
                  <FileUp className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isDragging ? "Drop folder or ZIP here" : "Click to upload .zip or drag folder"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ignores node_modules, .next, .git
                  </p>
                </div>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".zip"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

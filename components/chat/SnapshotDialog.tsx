"use client";

import { useState, useEffect } from "react";
import { History, RotateCcw, Plus, Loader2, FileClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Snapshot {
  _id: string;
  name: string;
  createdAt: string;
}

interface SnapshotDialogProps {
  projectId: string;
  onRestore?: () => void;
}

export function SnapshotDialog({ projectId, onRestore }: SnapshotDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  const fetchSnapshots = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshot`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots);
      }
    } catch (error) {
      console.error("Failed to fetch snapshots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots();
    }
  }, [isOpen, projectId]);

  const handleCreateSnapshot = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      
      if (res.ok) {
        await fetchSnapshots();
      }
    } catch (error) {
      console.error("Failed to create snapshot:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    setIsRestoring(snapshotId);
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", snapshotId }),
      });
      
      if (res.ok) {
        setIsOpen(false);
        if (onRestore) onRestore();
        // Reload page to reflect changes
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to restore snapshot:", error);
    } finally {
      setIsRestoring(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <History className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Snapshots & Rollback</TooltipContent>
      </Tooltip>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Project Snapshots</span>
            <Button 
              size="sm" 
              onClick={handleCreateSnapshot} 
              disabled={isCreating}
              className="gap-1 h-7 text-xs"
            >
              {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Create Snapshot
            </Button>
          </DialogTitle>
          <DialogDescription>
            Create snapshots to save your progress. Restore to any previous version if needed.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] pr-4 -mr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <FileClock className="h-8 w-8 opacity-50" />
              <p className="text-sm">No snapshots yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot._id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{snapshot.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs gap-1"
                        disabled={!!isRestoring}
                      >
                        {isRestoring === snapshot._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Restore
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore this snapshot?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will overwrite your current project files with the state from "{snapshot.name}".
                          A backup of your current state will be created automatically.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRestoreSnapshot(snapshot._id)}>
                          Restore
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

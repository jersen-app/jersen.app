/**
 * Component Templates
 * 
 * Pre-built templates for common UI components and patterns.
 */

import { Template } from './types';

export const dataTableTemplate: Template = {
  id: 'data-table',
  name: 'Data Table Component',
  description: 'Reusable data table with sorting, filtering, and pagination',
  category: 'component',
  variables: [
    {
      name: 'tableName',
      description: 'Name for the table component (e.g., "Users", "Products")',
      required: true,
      type: 'string'
    }
  ],
  files: [
    {
      path: 'components/{{tableName}}/DataTable.tsx',
      description: 'Main data table component',
      content: `'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T;
  pageSize?: number;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  searchKey,
  pageSize = 10,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  // Filter data
  const filteredData = searchKey
    ? data.filter((item) => {
        const value = String(item[searchKey]).toLowerCase();
        return value.includes(search.toLowerCase());
      })
    : data;

  // Sort data
  const sortedData = sortColumn
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortColumn as keyof T];
        const bValue = b[sortColumn as keyof T];
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortDirection === 'asc' ? comparison : -comparison;
      })
    : filteredData;

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getValue = (item: T, key: keyof T | string): unknown => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj, k) => (obj as Record<string, unknown>)?.[k], item);
    }
    return item[key as keyof T];
  };

  return (
    <div className="space-y-4">
      {/* Search and Page Size */}
      <div className="flex items-center justify-between gap-4">
        {searchKey && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
        )}
        <Select
          value={String(itemsPerPage)}
          onValueChange={(value) => {
            setItemsPerPage(Number(value));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 per page</SelectItem>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="25">25 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={column.sortable ? 'cursor-pointer select-none' : ''}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortColumn === column.key && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render
                        ? column.render(item)
                        : String(getValue(item, column.key) ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
          {Math.min(currentPage * itemsPerPage, sortedData.length)} of{' '}
          {sortedData.length} results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}`
    }
  ]
};

export const fileUploadTemplate: Template = {
  id: 'file-upload',
  name: 'File Upload Component',
  description: 'Drag-and-drop file upload with preview',
  category: 'file-upload',
  variables: [
    {
      name: 'componentName',
      description: 'Name for the upload component',
      required: true,
      type: 'string'
    },
    {
      name: 'acceptedTypes',
      description: 'Accepted file types (e.g., "image/*", "application/pdf")',
      required: false,
      type: 'string',
      defaultValue: 'image/*'
    },
    {
      name: 'maxSize',
      description: 'Maximum file size in MB',
      required: false,
      type: 'string',
      defaultValue: '5'
    }
  ],
  files: [
    {
      path: 'components/{{componentName}}/FileUpload.tsx',
      description: 'File upload component with drag-and-drop',
      content: `'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Upload, File, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  preview?: string;
  progress: number;
  error?: string;
}

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: Record<string, string[]>;
  maxSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
}

export function FileUpload({
  onUpload,
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
  maxSize = 5 * 1024 * 1024, // 5MB
  maxFiles = 5,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        file,
        preview: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));
    },
    [maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: maxFiles - files.length,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      // Simulate progress for each file
      for (let i = 0; i < files.length; i++) {
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
          );
        }
      }

      await onUpload(files.map((f) => f.file));
      setFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-primary">Drop the files here...</p>
        ) : (
          <div>
            <p className="mb-1">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-muted-foreground">
              Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB
              each
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              {/* Preview or Icon */}
              <div className="flex-shrink-0">
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : file.file.type.startsWith('image/') ? (
                  <Image className="h-10 w-10 text-muted-foreground" />
                ) : (
                  <File className="h-10 w-10 text-muted-foreground" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.file.size / 1024).toFixed(1)} KB
                </p>
                {isUploading && file.progress > 0 && (
                  <Progress value={file.progress} className="h-1 mt-1" />
                )}
              </div>

              {/* Remove Button */}
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <Button onClick={handleUpload} disabled={isUploading} className="w-full">
          {isUploading ? 'Uploading...' : \`Upload \${files.length} file(s)\`}
        </Button>
      )}
    </div>
  );
}`
    },
    {
      path: 'app/api/upload/route.ts',
      description: 'API route for file uploads',
      content: `import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        // Convert to buffer for processing
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // TODO: Upload to your storage provider (S3, Cloudflare R2, etc.)
        // Example: const url = await uploadToStorage(buffer, file.name);
        
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          // url: url,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      files: uploadResults,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};`
    }
  ],
  dependencies: ['react-dropzone']
};

export const modalFormTemplate: Template = {
  id: 'modal-form',
  name: 'Modal Form Component',
  description: 'Reusable modal dialog with form',
  category: 'form',
  variables: [
    {
      name: 'formName',
      description: 'Name of the form (e.g., "Contact", "Feedback")',
      required: true,
      type: 'string'
    }
  ],
  files: [
    {
      path: 'components/{{formName}}/{{formName}}Modal.tsx',
      description: 'Modal form component',
      content: `'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface {{FormName}}ModalProps {
  trigger?: React.ReactNode;
  onSubmit?: (data: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function {{FormName}}Modal({ trigger, onSubmit }: {{FormName}}ModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (onSubmit) {
          const result = await onSubmit(formData);
          if (result.success) {
            toast.success('Form submitted successfully!');
            setOpen(false);
          } else {
            toast.error(result.error || 'Something went wrong');
          }
        } else {
          // Default behavior: just close the modal
          toast.success('Form submitted!');
          setOpen(false);
        }
      } catch (error) {
        toast.error('Failed to submit form');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Open {{FormName}}</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{{FormName}}</DialogTitle>
            <DialogDescription>
              Fill out the form below. Click submit when you&apos;re done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Your name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Your message..."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}`
    }
  ],
  dependencies: ['sonner']
};

export const componentTemplates = [
  dataTableTemplate,
  fileUploadTemplate,
  modalFormTemplate
];

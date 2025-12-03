/**
 * CRUD Templates
 * 
 * Pre-built templates for Create, Read, Update, Delete operations.
 */

import { Template } from './types';

export const basicCrudPageTemplate: Template = {
  id: 'crud-page-basic',
  name: 'Basic CRUD Page',
  description: 'A complete CRUD page with server actions for managing resources',
  category: 'crud',
  variables: [
    {
      name: 'resourceName',
      description: 'Name of the resource (e.g., "post", "product")',
      required: true,
      type: 'string'
    },
    {
      name: 'resourceNamePlural',
      description: 'Plural name of the resource (e.g., "posts", "products")',
      required: true,
      type: 'string'
    },
    {
      name: 'fields',
      description: 'List of fields for the resource',
      required: true,
      type: 'array'
    }
  ],
  files: [
    {
      path: 'app/dashboard/{{resourceNamePlural}}/page.tsx',
      description: 'Main listing page with data table',
      content: `import { Suspense } from 'react';
import { {{ResourceName}}List } from '@/components/{{resourceNamePlural}}/{{ResourceName}}List';
import { {{ResourceName}}ListSkeleton } from '@/components/{{resourceNamePlural}}/{{ResourceName}}ListSkeleton';
import { Create{{ResourceName}}Button } from '@/components/{{resourceNamePlural}}/Create{{ResourceName}}Button';

export default function {{ResourceName}}sPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{{ResourceNamePlural}}</h1>
        <Create{{ResourceName}}Button />
      </div>
      
      <Suspense fallback={<{{ResourceName}}ListSkeleton />}>
        <{{ResourceName}}List />
      </Suspense>
    </div>
  );
}`
    },
    {
      path: 'app/dashboard/{{resourceNamePlural}}/[id]/page.tsx',
      description: 'Detail/Edit page for single resource',
      content: `import { notFound } from 'next/navigation';
import { get{{ResourceName}}ById } from '@/lib/actions/{{resourceNamePlural}}';
import { {{ResourceName}}Form } from '@/components/{{resourceNamePlural}}/{{ResourceName}}Form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Edit{{ResourceName}}Page({ params }: PageProps) {
  const { id } = await params;
  const {{resourceName}} = await get{{ResourceName}}ById(id);
  
  if (!{{resourceName}}) {
    notFound();
  }
  
  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Edit {{ResourceName}}</h1>
      <{{ResourceName}}Form {{resourceName}}={{{resourceName}}} />
    </div>
  );
}`
    },
    {
      path: 'lib/actions/{{resourceNamePlural}}.ts',
      description: 'Server actions for CRUD operations',
      content: `'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// Define your schema based on the resource fields
const {{resourceName}}Schema = z.object({
  {{#fields}}
  {{name}}: z.{{type}}(),
  {{/fields}}
});

export type {{ResourceName}} = z.infer<typeof {{resourceName}}Schema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

// In-memory store for demo - replace with your database
const {{resourceNamePlural}}: {{ResourceName}}[] = [];

export async function get{{ResourceName}}s(): Promise<{{ResourceName}}[]> {
  // TODO: Replace with actual database query
  return {{resourceNamePlural}};
}

export async function get{{ResourceName}}ById(id: string): Promise<{{ResourceName}} | null> {
  // TODO: Replace with actual database query
  return {{resourceNamePlural}}.find(item => item.id === id) || null;
}

export async function create{{ResourceName}}(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const rawData = Object.fromEntries(formData);
    const validated = {{resourceName}}Schema.parse(rawData);
    
    const new{{ResourceName}}: {{ResourceName}} = {
      id: crypto.randomUUID(),
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // TODO: Save to database
    {{resourceNamePlural}}.push(new{{ResourceName}});
    
    revalidatePath('/dashboard/{{resourceNamePlural}}');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to create {{resourceName}}' };
  }
}

export async function update{{ResourceName}}(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const rawData = Object.fromEntries(formData);
    const validated = {{resourceName}}Schema.partial().parse(rawData);
    
    const index = {{resourceNamePlural}}.findIndex(item => item.id === id);
    if (index === -1) {
      return { success: false, error: '{{ResourceName}} not found' };
    }
    
    // TODO: Update in database
    {{resourceNamePlural}}[index] = {
      ...{{resourceNamePlural}}[index],
      ...validated,
      updatedAt: new Date(),
    };
    
    revalidatePath('/dashboard/{{resourceNamePlural}}');
    revalidatePath(\`/dashboard/{{resourceNamePlural}}/\${id}\`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to update {{resourceName}}' };
  }
}

export async function delete{{ResourceName}}(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const index = {{resourceNamePlural}}.findIndex(item => item.id === id);
    if (index === -1) {
      return { success: false, error: '{{ResourceName}} not found' };
    }
    
    // TODO: Delete from database
    {{resourceNamePlural}}.splice(index, 1);
    
    revalidatePath('/dashboard/{{resourceNamePlural}}');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete {{resourceName}}' };
  }
}`
    },
    {
      path: 'components/{{resourceNamePlural}}/{{ResourceName}}Form.tsx',
      description: 'Reusable form component for create/edit',
      content: `'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { create{{ResourceName}}, update{{ResourceName}}, type {{ResourceName}} } from '@/lib/actions/{{resourceNamePlural}}';
import { toast } from 'sonner';

interface {{ResourceName}}FormProps {
  {{resourceName}}?: {{ResourceName}};
}

export function {{ResourceName}}Form({ {{resourceName}} }: {{ResourceName}}FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!{{resourceName}};
  
  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await update{{ResourceName}}({{resourceName}}!.id, formData)
        : await create{{ResourceName}}(formData);
      
      if (result.success) {
        toast.success(isEditing ? '{{ResourceName}} updated' : '{{ResourceName}} created');
        router.push('/dashboard/{{resourceNamePlural}}');
      } else {
        toast.error(result.error);
      }
    });
  }
  
  return (
    <Card>
      <form action={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          {{#fields}}
          <div className="space-y-2">
            <Label htmlFor="{{name}}">{{label}}</Label>
            <Input
              id="{{name}}"
              name="{{name}}"
              type="{{inputType}}"
              defaultValue={{{resourceName}}?.{{name}} ?? ''}
              required={{#required}}{{/required}}
            />
          </div>
          {{/fields}}
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}`
    },
    {
      path: 'components/{{resourceNamePlural}}/{{ResourceName}}List.tsx',
      description: 'List component with data table',
      content: `import { get{{ResourceName}}s } from '@/lib/actions/{{resourceNamePlural}}';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { {{ResourceName}}Actions } from './{{ResourceName}}Actions';

export async function {{ResourceName}}List() {
  const {{resourceNamePlural}} = await get{{ResourceName}}s();
  
  if ({{resourceNamePlural}}.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No {{resourceNamePlural}} found. Create your first one!
      </div>
    );
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {{#fields}}
          <TableHead>{{label}}</TableHead>
          {{/fields}}
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {{{resourceNamePlural}}.map(({{resourceName}}) => (
          <TableRow key={{{resourceName}}.id}>
            {{#fields}}
            <TableCell>{{{resourceName}}.{{name}}}</TableCell>
            {{/fields}}
            <TableCell>
              <{{ResourceName}}Actions id={{{resourceName}}.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}`
    },
    {
      path: 'components/{{resourceNamePlural}}/{{ResourceName}}Actions.tsx',
      description: 'Action buttons for edit/delete',
      content: `'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { delete{{ResourceName}} } from '@/lib/actions/{{resourceNamePlural}}';
import { toast } from 'sonner';

interface {{ResourceName}}ActionsProps {
  id: string;
}

export function {{ResourceName}}Actions({ id }: {{ResourceName}}ActionsProps) {
  const [isPending, startTransition] = useTransition();
  
  function handleDelete() {
    startTransition(async () => {
      const result = await delete{{ResourceName}}(id);
      if (result.success) {
        toast.success('{{ResourceName}} deleted');
      } else {
        toast.error(result.error);
      }
    });
  }
  
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={\`/dashboard/{{resourceNamePlural}}/\${id}\`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this {{resourceName}}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}`
    }
  ],
  dependencies: ['sonner'],
  instructions: 'Replace the in-memory store with your actual database queries. Update the schema fields to match your data model.'
};

export const crudApiTemplate: Template = {
  id: 'crud-api',
  name: 'CRUD API Routes',
  description: 'RESTful API routes for CRUD operations',
  category: 'api',
  variables: [
    {
      name: 'resourceName',
      description: 'Name of the resource',
      required: true,
      type: 'string'
    },
    {
      name: 'resourceNamePlural',
      description: 'Plural name of the resource',
      required: true,
      type: 'string'
    }
  ],
  files: [
    {
      path: 'app/api/{{resourceNamePlural}}/route.ts',
      description: 'List and create endpoints',
      content: `import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define your schema
const {{resourceName}}Schema = z.object({
  // Add your fields here
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // TODO: Fetch from database
    const {{resourceNamePlural}} = [];
    const total = 0;
    
    return NextResponse.json({
      data: {{resourceNamePlural}},
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching {{resourceNamePlural}}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch {{resourceNamePlural}}' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = {{resourceName}}Schema.parse(body);
    
    // TODO: Save to database
    const new{{ResourceName}} = {
      id: crypto.randomUUID(),
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return NextResponse.json(new{{ResourceName}}, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating {{resourceName}}:', error);
    return NextResponse.json(
      { error: 'Failed to create {{resourceName}}' },
      { status: 500 }
    );
  }
}`
    },
    {
      path: 'app/api/{{resourceNamePlural}}/[id]/route.ts',
      description: 'Get, update, and delete endpoints',
      content: `import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define your schema
const {{resourceName}}Schema = z.object({
  // Add your fields here
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    // TODO: Fetch from database
    const {{resourceName}} = null;
    
    if (!{{resourceName}}) {
      return NextResponse.json(
        { error: '{{ResourceName}} not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({{resourceName}});
  } catch (error) {
    console.error('Error fetching {{resourceName}}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch {{resourceName}}' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validated = {{resourceName}}Schema.partial().parse(body);
    
    // TODO: Update in database
    const updated{{ResourceName}} = {
      id,
      ...validated,
      updatedAt: new Date(),
    };
    
    return NextResponse.json(updated{{ResourceName}});
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating {{resourceName}}:', error);
    return NextResponse.json(
      { error: 'Failed to update {{resourceName}}' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    // TODO: Delete from database
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting {{resourceName}}:', error);
    return NextResponse.json(
      { error: 'Failed to delete {{resourceName}}' },
      { status: 500 }
    );
  }
}`
    }
  ]
};

export const crudTemplates = [basicCrudPageTemplate, crudApiTemplate];

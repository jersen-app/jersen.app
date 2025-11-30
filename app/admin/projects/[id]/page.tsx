import connectDB from "@/lib/db";
import Project from "@/models/Project";
import ProductionRequest from "@/models/ProductionRequest";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, 
    ExternalLink, 
    FileCode,
    Folder,
    Calendar,
    User,
    Database,
    Key,
    Rocket
} from "lucide-react";

async function getProject(id: string) {
    await connectDB();
    const project = await Project.findById(id).lean();
    if (!project) return null;
    
    const requests = await ProductionRequest.find({ projectId: id }).sort({ createdAt: -1 }).lean();
    return { project, requests };
}

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = await getProject(id);
    
    if (!data) {
        notFound();
    }

    const { project, requests } = data as { project: any; requests: any[] };

    // Build file tree structure
    const fileTree = project.files?.reduce((acc: Record<string, any>, file: any) => {
        const parts = file.path.split('/');
        let current = acc;
        parts.forEach((part: string, i: number) => {
            if (i === parts.length - 1) {
                current[part] = { type: 'file', path: file.path, content: file.content };
            } else {
                if (!current[part]) current[part] = { type: 'folder', children: {} };
                current = current[part].children;
            }
        });
        return acc;
    }, {}) || {};

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/admin/projects">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {project.description || "No description"}
                    </p>
                </div>
                <Button asChild>
                    <Link href={`/dashboard/projects/${project._id}/builder`} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Builder
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Project Files */}
                    <div className="rounded-xl border bg-card">
                        <div className="border-b p-4 flex items-center justify-between">
                            <h2 className="font-semibold flex items-center gap-2">
                                <FileCode className="h-4 w-4" />
                                Project Files
                            </h2>
                            <Badge variant="secondary">{project.files?.length || 0} files</Badge>
                        </div>
                        <div className="p-4">
                            {project.files?.length > 0 ? (
                                <div className="space-y-1 font-mono text-sm">
                                    {project.files.map((file: any) => (
                                        <div 
                                            key={file.path}
                                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted"
                                        >
                                            <FileCode className="h-4 w-4 text-blue-500" />
                                            <span>{file.path}</span>
                                            <span className="ml-auto text-xs text-muted-foreground">
                                                {file.content?.length || 0} chars
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No files in this project yet
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Production Requests */}
                    <div className="rounded-xl border bg-card">
                        <div className="border-b p-4 flex items-center justify-between">
                            <h2 className="font-semibold flex items-center gap-2">
                                <Rocket className="h-4 w-4" />
                                Production Requests
                            </h2>
                            <Badge variant="secondary">{requests.length} requests</Badge>
                        </div>
                        <div className="divide-y">
                            {requests.length > 0 ? (
                                requests.map((request: any) => (
                                    <Link 
                                        key={request._id}
                                        href={`/admin/requests/${request._id}`}
                                        className="flex items-center justify-between p-4 hover:bg-muted/50"
                                    >
                                        <div>
                                            <p className="font-medium">{request.status}</p>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {request.description}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary">{request.budgetRange}</Badge>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(request.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No production requests
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Project Info */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold">Project Info</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge className="mt-1 capitalize">{project.status}</Badge>
                            </div>
                            {project.productionStatus && project.productionStatus !== "none" && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Production Status</p>
                                    <Badge variant="secondary" className="mt-1 capitalize">
                                        <Rocket className="h-3 w-3 mr-1" />
                                        {project.productionStatus.replace("_", " ")}
                                    </Badge>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Created
                                </p>
                                <p className="text-sm font-medium">
                                    {new Date(project.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Updated
                                </p>
                                <p className="text-sm font-medium">
                                    {new Date(project.updatedAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* IDs */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold">Identifiers</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Project ID</p>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded block mt-1 break-all">
                                    {project._id}
                                </code>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    User ID
                                </p>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded block mt-1 break-all">
                                    {project.userId}
                                </code>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Organization ID</p>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded block mt-1 break-all">
                                    {project.orgId}
                                </code>
                            </div>
                            {project.apiKey && (
                                <div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Key className="h-3 w-3" />
                                        API Key
                                    </p>
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded block mt-1">
                                        {project.apiKey.slice(0, 20)}...
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Providers */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Providers
                        </h2>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Auth</span>
                                <Badge variant={project.providers?.auth?.enabled ? "default" : "secondary"}>
                                    {project.providers?.auth?.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Storage</span>
                                <Badge variant={project.providers?.storage?.enabled ? "default" : "secondary"}>
                                    {project.providers?.storage?.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Database</span>
                                <Badge variant={project.providers?.database?.enabled ? "default" : "secondary"}>
                                    {project.providers?.database?.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

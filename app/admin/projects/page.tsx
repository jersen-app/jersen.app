import connectDB from "@/lib/db";
import Project from "@/models/Project";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ExternalLink, FolderKanban, Rocket } from "lucide-react";

const statusColors: Record<string, string> = {
    planning: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    "in-progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const productionStatusColors: Record<string, string> = {
    none: "",
    requested: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
    quoted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    in_production: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    deployed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

async function getProjects() {
    await connectDB();
    const projects = await Project.find()
        .sort({ createdAt: -1 })
        .lean();
    return projects;
}

export default async function AdminProjectsPage() {
    const projects = await getProjects();

    // Group projects by organization
    const projectsByOrg = projects.reduce((acc: Record<string, any[]>, project: any) => {
        const orgId = project.orgId || "unknown";
        if (!acc[orgId]) acc[orgId] = [];
        acc[orgId].push(project);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">All Projects</h1>
                    <p className="text-sm text-muted-foreground">
                        View and manage all projects across organizations.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FolderKanban className="h-4 w-4" />
                    {projects.length} total projects
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Total Projects</p>
                    <p className="text-2xl font-bold">{projects.length}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Planning</p>
                    <p className="text-2xl font-bold">
                        {projects.filter((p: any) => p.status === "planning").length}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">
                        {projects.filter((p: any) => p.status === "in-progress").length}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">With Production Requests</p>
                    <p className="text-2xl font-bold">
                        {projects.filter((p: any) => p.productionStatus && p.productionStatus !== "none").length}
                    </p>
                </div>
            </div>

            {/* Projects Table */}
            <div className="rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Project
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Organization
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Production
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Files
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {projects.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                        No projects yet
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project: any) => (
                                    <tr key={project._id} className="hover:bg-muted/50">
                                        <td className="px-4 py-4">
                                            <div>
                                                <p className="font-medium">{project.name}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                                                    {project.description || "No description"}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                {project.orgId?.slice(0, 12)}...
                                            </code>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge className={statusColors[project.status]}>
                                                {project.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4">
                                            {project.productionStatus && project.productionStatus !== "none" ? (
                                                <Badge className={productionStatusColors[project.productionStatus]}>
                                                    <Rocket className="h-3 w-3 mr-1" />
                                                    {project.productionStatus.replace("_", " ")}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            {project.files?.length || 0}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-muted-foreground">
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button asChild variant="ghost" size="icon-sm">
                                                    <Link href={`/admin/projects/${project._id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button asChild variant="ghost" size="icon-sm">
                                                    <Link href={`/dashboard/projects/${project._id}/builder`} target="_blank">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Projects by Organization */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">By Organization</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(projectsByOrg).map(([orgId, orgProjects]) => (
                        <div key={orgId} className="rounded-xl border bg-card p-4">
                            <div className="flex items-center justify-between mb-3">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                    {orgId.slice(0, 16)}...
                                </code>
                                <Badge variant="secondary">{orgProjects.length} projects</Badge>
                            </div>
                            <div className="space-y-2">
                                {orgProjects.slice(0, 3).map((project: any) => (
                                    <div key={project._id} className="flex items-center justify-between text-sm">
                                        <span className="truncate">{project.name}</span>
                                        <Badge className={statusColors[project.status]} variant="secondary">
                                            {project.status}
                                        </Badge>
                                    </div>
                                ))}
                                {orgProjects.length > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                        +{orgProjects.length - 3} more
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

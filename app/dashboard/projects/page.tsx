import { getProjects } from "@/lib/actions/projects";
import { FolderKanban, Sparkles, Rocket } from "lucide-react";
import Link from "next/link";
import { CreateProjectDialog, ProductionRequestButton } from "@/components/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, { dot: string; badge: string }> = {
    planning: { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    "in-progress": { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    completed: { dot: "bg-green-500", badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
};

const productionStatusConfig: Record<string, { label: string; color: string }> = {
    none: { label: "", color: "" },
    requested: { label: "Requested", color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
    quoted: { label: "Quoted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    in_production: { label: "In Production", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    deployed: { label: "Deployed", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
};

export default async function ProjectsPage() {
    const projects = await getProjects();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your organization's projects and track progress.
                    </p>
                </div>
                <CreateProjectDialog />
            </div>

            {/* Projects Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900">
                            <FolderKanban className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No projects yet</h3>
                        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                            Get started by creating your first project. Use AI to build and deploy your ideas.
                        </p>
                        <div className="mt-6">
                            <CreateProjectDialog />
                        </div>
                    </div>
                ) : (
                    projects.map((project: any) => {
                        const status = statusColors[project.status] || statusColors.planning;
                        const productionStatus = productionStatusConfig[project.productionStatus || "none"];

                        return (
                            <div
                                key={project._id}
                                className="group relative flex flex-col rounded-xl border border-border bg-card transition-all hover:shadow-md hover:border-muted-foreground/30"
                            >
                                {/* Card Header */}
                                <div className="p-5 pb-3">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${status.dot}`} />
                                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                {project.status.replace("-", " ")}
                                            </span>
                                        </div>
                                        {productionStatus.label && (
                                            <Badge className={productionStatus.color} variant="secondary">
                                                <Rocket className="h-3 w-3 mr-1" />
                                                {productionStatus.label}
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                        {project.name}
                                    </h3>
                                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                                        {project.description || "No description provided."}
                                    </p>
                                </div>

                                {/* Card Footer */}
                                <div className="mt-auto border-t border-border p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(project.createdAt).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                                                <Link href={`/dashboard/projects/${project._id}/builder`}>
                                                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                                                    Builder
                                                </Link>
                                            </Button>
                                            <ProductionRequestButton 
                                                projectId={project._id.toString()} 
                                                projectName={project.name}
                                                productionStatus={project.productionStatus || "none"}
                                            />
                                            <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
                                                <Link href={`/dashboard/projects/${project._id}/settings`}>
                                                    Settings
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

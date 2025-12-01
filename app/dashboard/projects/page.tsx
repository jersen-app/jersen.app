import { getProjects } from "@/lib/actions/projects";
import { FolderKanban } from "lucide-react";
import { CreateProjectDialog } from "@/components/projects";
import { ProjectCard } from "./ProjectCard";

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
            {projects.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-muted p-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                        <FolderKanban className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                        Get started by creating your first project. Use AI to build and deploy your ideas.
                    </p>
                    <div className="mt-6">
                        <CreateProjectDialog />
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project: any) => (
                        <ProjectCard key={project._id} project={project} />
                    ))}
                </div>
            )}
        </div>
    );
}

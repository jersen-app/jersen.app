import { getProjects } from "@/lib/actions/projects";
import { FolderKanban } from "lucide-react";
import Link from "next/link";
import CreateProjectForm from "@/components/CreateProjectForm";

export default async function ProjectsPage() {
    const projects = await getProjects();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage your organization's projects and track progress.
                    </p>
                </div>
            </div>

            {/* Create Project Form */}
            <CreateProjectForm />

            {/* Projects List */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                        <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No projects</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Get started by creating a new project above.
                        </p>
                    </div>
                ) : (
                    projects.map((project: any) => (
                        <div
                            key={project._id}
                            className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-black"
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${project.status === 'completed' ? 'bg-green-500' :
                                            project.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                                            }`} />
                                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                                            {project.status}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                                    {project.name}
                                </h3>
                                <p className="mt-2 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                                    {project.description || "No description provided."}
                                </p>
                            </div>
                            <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-400">
                                        Created {new Date(project.createdAt).toLocaleDateString()}
                                    </p>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/dashboard/projects/${project._id}/builder`}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            Builder →
                                        </Link>
                                        <Link
                                            href={`/dashboard/projects/${project._id}/settings`}
                                            className="text-xs font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
                                        >
                                            Settings →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

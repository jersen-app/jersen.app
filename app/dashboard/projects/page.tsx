import { createProject, getProjects } from "@/lib/actions/projects";
import { Plus, FolderKanban } from "lucide-react";

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
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black">
                <h2 className="mb-4 text-lg font-medium">New Project</h2>
                <form action={createProject} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                Project Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                placeholder="e.g. Mobile App MVP"
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white dark:focus:ring-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="status" className="text-sm font-medium">
                                Status
                            </label>
                            <select
                                name="status"
                                id="status"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white dark:focus:ring-white"
                            >
                                <option value="planning">Planning</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">
                            Description
                        </label>
                        <textarea
                            name="description"
                            id="description"
                            rows={3}
                            placeholder="Project details..."
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white dark:focus:ring-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Project
                    </button>
                </form>
            </div>

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
                                    <Link
                                        href={`/dashboard/projects/${project._id}/settings`}
                                        className="text-xs font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
                                    >
                                        Settings →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

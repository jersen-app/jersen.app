import { getProjectById } from "@/lib/actions/api-keys";
import { notFound } from "next/navigation";
import ApiKeyDisplay from "@/components/ApiKeyDisplay";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
    const project = await getProjectById(params.id);

    if (!project) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/projects"
                    className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">API Settings & Configuration</p>
                </div>
            </div>

            {/* API Key Section */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-medium">API Key</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Use this key to authenticate API requests to Jersen providers.
                    </p>
                </div>
                <ApiKeyDisplay initialApiKey={project.apiKey} projectId={project._id} />
            </div>

            {/* Providers Status */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-medium">Providers</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Status of enabled providers for this project.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-black">
                        <h3 className="font-medium">Authentication</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {project.providers?.auth?.enabled ? "Enabled" : "Disabled"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-black">
                        <h3 className="font-medium">Storage</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {project.providers?.storage?.enabled
                                ? `Enabled (${project.providers.storage.quota}MB quota)`
                                : "Disabled"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-black">
                        <h3 className="font-medium">Database</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {project.providers?.database?.enabled
                                ? project.providers.database.dbName
                                    ? "Provisioned"
                                    : "Pending"
                                : "Disabled"}
                        </p>
                    </div>
                </div>
            </div>

            {/* API Endpoints Documentation */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-medium">API Endpoints</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Available provider endpoints for this project.
                    </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                    <div className="space-y-4 font-mono text-sm">
                        <div>
                            <p className="font-semibold">Storage:</p>
                            <p className="text-gray-500">POST /api/providers/storage</p>
                            <p className="text-gray-500">GET /api/providers/storage?key=...</p>
                        </div>
                        <div>
                            <p className="font-semibold">Database:</p>
                            <p className="text-gray-500">POST /api/providers/database/insert</p>
                            <p className="text-gray-500">GET /api/providers/database/find?collection=...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

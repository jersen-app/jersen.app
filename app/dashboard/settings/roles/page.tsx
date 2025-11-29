import { createRole, deleteRole, getRoles } from "@/lib/actions/roles";
import { Plus, Trash2 } from "lucide-react";

export default async function RolesPage() {
    const roles = await getRoles();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage custom roles and permissions for your organization members.
                    </p>
                </div>
            </div>

            {/* Create Role Form */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black">
                <h2 className="mb-4 text-lg font-medium">Create New Role</h2>
                <form action={createRole} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                Role Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                placeholder="e.g. Project Manager"
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white dark:focus:ring-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="description" className="text-sm font-medium">
                                Description
                            </label>
                            <input
                                type="text"
                                name="description"
                                id="description"
                                placeholder="Role description"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white dark:focus:ring-white"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="permissions" className="text-sm font-medium">
                            Permissions (comma separated)
                        </label>
                        <input
                            type="text"
                            name="permissions"
                            id="permissions"
                            placeholder="read:projects, write:projects"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white dark:focus:ring-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Role
                    </button>
                </form>
            </div>

            {/* Roles List */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-black">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                    <h2 className="text-lg font-medium">Existing Roles</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {roles.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500">
                            No custom roles created yet.
                        </div>
                    ) : (
                        roles.map((role: any) => (
                            <div key={role._id} className="flex items-center justify-between p-6">
                                <div>
                                    <h3 className="font-medium">{role.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {role.description || "No description"}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {role.permissions.map((perm: string) => (
                                            <span
                                                key={perm}
                                                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                            >
                                                {perm}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <form action={deleteRole.bind(null, role._id)}>
                                    <button
                                        type="submit"
                                        className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

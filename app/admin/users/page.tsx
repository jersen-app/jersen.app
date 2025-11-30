import { clerkClient } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import ProductionRequest from "@/models/ProductionRequest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Users, 
    Mail, 
    Calendar, 
    FolderKanban,
    ExternalLink,
    Building2
} from "lucide-react";
import Link from "next/link";

async function getUsers() {
    const client = await clerkClient();
    
    // Get all users from Clerk
    const usersResponse = await client.users.getUserList({
        limit: 100,
        orderBy: "-created_at",
    });

    await connectDB();

    // Get project counts and request counts for each user
    const userStats = await Promise.all(
        usersResponse.data.map(async (user) => {
            const projectCount = await Project.countDocuments({ userId: user.id });
            const requestCount = await ProductionRequest.countDocuments({ userId: user.id });
            return {
                userId: user.id,
                projectCount,
                requestCount,
            };
        })
    );

    const statsMap = userStats.reduce((acc, stat) => {
        acc[stat.userId] = stat;
        return acc;
    }, {} as Record<string, { projectCount: number; requestCount: number }>);

    return {
        users: usersResponse.data,
        statsMap,
        totalCount: usersResponse.totalCount,
    };
}

async function getOrganizations() {
    const client = await clerkClient();
    const orgsResponse = await client.organizations.getOrganizationList({
        limit: 100,
    });
    return orgsResponse.data;
}

export default async function AdminUsersPage() {
    const { users, statsMap, totalCount } = await getUsers();
    const organizations = await getOrganizations();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage users and view their activity.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {totalCount} total users
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{totalCount}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Organizations</p>
                    <p className="text-2xl font-bold">{organizations.length}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Users with Projects</p>
                    <p className="text-2xl font-bold">
                        {Object.values(statsMap).filter(s => s.projectCount > 0).length}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Users with Requests</p>
                    <p className="text-2xl font-bold">
                        {Object.values(statsMap).filter(s => s.requestCount > 0).length}
                    </p>
                </div>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border bg-card">
                <div className="border-b p-4">
                    <h2 className="font-semibold">All Users</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Projects
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Requests
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Last Active
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                        No users yet
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => {
                                    const stats = statsMap[user.id] || { projectCount: 0, requestCount: 0 };
                                    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
                                    
                                    return (
                                        <tr key={user.id} className="hover:bg-muted/50">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    {user.imageUrl ? (
                                                        <img 
                                                            src={user.imageUrl} 
                                                            alt={user.firstName || ""} 
                                                            className="h-8 w-8 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                            <Users className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium">
                                                            {user.firstName} {user.lastName}
                                                        </p>
                                                        <code className="text-xs text-muted-foreground">
                                                            {user.id.slice(0, 12)}...
                                                        </code>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm">{primaryEmail?.emailAddress}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge variant="secondary">
                                                    <FolderKanban className="h-3 w-3 mr-1" />
                                                    {stats.projectCount}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge variant={stats.requestCount > 0 ? "default" : "secondary"}>
                                                    {stats.requestCount}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-muted-foreground">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-muted-foreground">
                                                {user.lastActiveAt 
                                                    ? new Date(user.lastActiveAt).toLocaleDateString()
                                                    : "Never"
                                                }
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button asChild variant="ghost" size="icon-sm">
                                                        <Link href={`/admin/users/${user.id}`}>
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Organizations */}
            <div className="rounded-xl border bg-card">
                <div className="border-b p-4">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Organizations
                    </h2>
                </div>
                <div className="divide-y">
                    {organizations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No organizations yet
                        </div>
                    ) : (
                        organizations.map((org) => (
                            <div key={org.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    {org.imageUrl ? (
                                        <img 
                                            src={org.imageUrl} 
                                            alt={org.name} 
                                            className="h-10 w-10 rounded-lg"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium">{org.name}</p>
                                        <code className="text-xs text-muted-foreground">
                                            {org.id}
                                        </code>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">
                                        Created {new Date(org.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

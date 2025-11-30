import { clerkClient } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import ProductionRequest from "@/models/ProductionRequest";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, 
    Mail, 
    Calendar,
    FolderKanban,
    Rocket,
    ExternalLink,
    User,
    Building2,
    Clock
} from "lucide-react";

async function getUser(id: string) {
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(id);
        
        await connectDB();
        
        const projects = await Project.find({ userId: id }).sort({ createdAt: -1 }).lean();
        const requests = await ProductionRequest.find({ userId: id }).sort({ createdAt: -1 }).lean();
        
        // Get user's organizations
        const orgs = await client.users.getOrganizationMembershipList({ userId: id });
        
        return { user, projects, requests, organizations: orgs.data };
    } catch (error) {
        return null;
    }
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = await getUser(id);
    
    if (!data) {
        notFound();
    }

    const { user, projects, requests, organizations } = data;
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/admin/users">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-4 flex-1">
                    {user.imageUrl ? (
                        <img 
                            src={user.imageUrl} 
                            alt={user.firstName || ""} 
                            className="h-12 w-12 rounded-full"
                        />
                    ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {user.firstName} {user.lastName}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {primaryEmail?.emailAddress}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Projects */}
                    <div className="rounded-xl border bg-card">
                        <div className="border-b p-4 flex items-center justify-between">
                            <h2 className="font-semibold flex items-center gap-2">
                                <FolderKanban className="h-4 w-4" />
                                Projects
                            </h2>
                            <Badge variant="secondary">{projects.length} projects</Badge>
                        </div>
                        <div className="divide-y">
                            {projects.length > 0 ? (
                                projects.map((project: any) => (
                                    <div key={project._id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                                        <div>
                                            <Link 
                                                href={`/admin/projects/${project._id}`}
                                                className="font-medium hover:underline"
                                            >
                                                {project.name}
                                            </Link>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {project.description || "No description"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="capitalize">
                                                {project.status}
                                            </Badge>
                                            <Button asChild variant="ghost" size="icon-sm">
                                                <Link href={`/dashboard/projects/${project._id}/builder`} target="_blank">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No projects yet
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
                                            <p className="font-medium">{request.projectName}</p>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {request.description}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary" className="capitalize">
                                                {request.status.replace("_", " ")}
                                            </Badge>
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
                    {/* User Info */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold">User Info</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">User ID</p>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded block mt-1 break-all">
                                    {user.id}
                                </code>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    Email
                                </p>
                                <p className="text-sm font-medium">{primaryEmail?.emailAddress}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Joined
                                </p>
                                <p className="text-sm font-medium">
                                    {new Date(user.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Last Active
                                </p>
                                <p className="text-sm font-medium">
                                    {user.lastActiveAt 
                                        ? new Date(user.lastActiveAt).toLocaleString()
                                        : "Never"
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Organizations */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Organizations
                        </h2>
                        {organizations.length > 0 ? (
                            <div className="space-y-3">
                                {organizations.map((membership: any) => (
                                    <div key={membership.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {membership.organization.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {membership.role}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Not a member of any organization
                            </p>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold">Stats</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold">{projects.length}</p>
                                <p className="text-xs text-muted-foreground">Projects</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold">{requests.length}</p>
                                <p className="text-xs text-muted-foreground">Requests</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

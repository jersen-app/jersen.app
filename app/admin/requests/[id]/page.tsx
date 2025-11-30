import connectDB from "@/lib/db";
import ProductionRequest from "@/models/ProductionRequest";
import Project from "@/models/Project";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, 
    ExternalLink, 
    MessageCircle, 
    User, 
    Calendar,
    DollarSign,
    Clock,
    FileText
} from "lucide-react";
import RequestActionsForm from "./RequestActionsForm";

async function getRequest(id: string) {
    await connectDB();
    const request = await ProductionRequest.findById(id).lean();
    if (!request) return null;
    
    const project = await Project.findById(request.projectId).lean();
    return { request, project };
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = await getRequest(id);
    
    if (!data) {
        notFound();
    }

    const { request, project } = data as { request: any; project: any };

    const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800",
        reviewing: "bg-purple-100 text-purple-800",
        quoted: "bg-amber-100 text-amber-800",
        accepted: "bg-green-100 text-green-800",
        in_progress: "bg-blue-100 text-blue-800",
        completed: "bg-green-100 text-green-800",
        rejected: "bg-red-100 text-red-800",
    };

    const budgetLabels: Record<string, string> = {
        under_500: "Under $500",
        "500_1000": "$500 - $1,000",
        "1000_2500": "$1,000 - $2,500",
        "2500_5000": "$2,500 - $5,000",
        "5000_plus": "$5,000+",
        need_quote: "Needs Quote",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/admin/requests">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{request.projectName}</h1>
                    <p className="text-sm text-muted-foreground">
                        Request #{request._id.toString().slice(-8)}
                    </p>
                </div>
                <Badge className={statusColors[request.status]}>
                    {request.status.replace("_", " ")}
                </Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Request Details */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Request Details
                        </h2>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap">{request.description}</p>
                        </div>
                    </div>

                    {/* Project Info */}
                    {project && (
                        <div className="rounded-xl border bg-card p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold">Project Info</h2>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/dashboard/projects/${project._id}/builder`} target="_blank">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open Builder
                                    </Link>
                                </Button>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <p className="font-medium capitalize">{project.status}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Files</p>
                                    <p className="font-medium">{project.files?.length || 0} files</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-sm text-muted-foreground">Description</p>
                                    <p className="text-sm">{project.description || "No description"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quote Section */}
                    {request.quote && (
                        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-6 space-y-4">
                            <h2 className="font-semibold flex items-center gap-2 text-green-800 dark:text-green-200">
                                <DollarSign className="h-4 w-4" />
                                Quote Sent
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <p className="text-sm text-green-700 dark:text-green-300">Amount</p>
                                    <p className="text-xl font-bold text-green-800 dark:text-green-200">
                                        ${request.quote.amount} {request.quote.currency}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-green-700 dark:text-green-300">Estimated Days</p>
                                    <p className="font-medium text-green-800 dark:text-green-200">
                                        {request.quote.estimatedDays} days
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-green-700 dark:text-green-300">Sent On</p>
                                    <p className="font-medium text-green-800 dark:text-green-200">
                                        {new Date(request.quote.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            {request.quote.description && (
                                <div>
                                    <p className="text-sm text-green-700 dark:text-green-300">Details</p>
                                    <p className="text-sm text-green-800 dark:text-green-200">{request.quote.description}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions Form */}
                    <RequestActionsForm 
                        requestId={request._id.toString()} 
                        currentStatus={request.status}
                        projectId={request.projectId}
                    />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* User Info */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            User Info
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">{request.userName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <a href={`mailto:${request.userEmail}`} className="text-sm text-blue-600 hover:underline">
                                    {request.userEmail}
                                </a>
                            </div>
                            {request.telegramContact && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Telegram</p>
                                    <a 
                                        href={`https://t.me/${request.telegramContact}`} 
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                    >
                                        <MessageCircle className="h-3 w-3" />
                                        @{request.telegramContact}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Request Meta */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Request Info
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Budget Range</p>
                                <p className="font-medium">
                                    {budgetLabels[request.budgetRange] || request.budgetRange}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Priority</p>
                                <Badge variant="secondary" className="capitalize">
                                    {request.priority}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Created</p>
                                <p className="text-sm">
                                    {new Date(request.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Last Updated</p>
                                <p className="text-sm">
                                    {new Date(request.updatedAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Admin Notes */}
                    {request.adminNotes && (
                        <div className="rounded-xl border bg-card p-6 space-y-2">
                            <h2 className="font-semibold">Admin Notes</h2>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {request.adminNotes}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

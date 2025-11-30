import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import ProductionRequest from "@/models/ProductionRequest";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, 
    MessageCircle, 
    DollarSign, 
    Clock,
    CheckCircle,
    Rocket,
    FileCode,
    Calendar,
    Loader2,
    ExternalLink,
    Sparkles
} from "lucide-react";
import QuoteResponseForm from "./QuoteResponseForm";

const TELEGRAM_LINK = "https://t.me/jersenteam";

const statusSteps = [
    { key: "requested", label: "Requested", icon: Rocket },
    { key: "quoted", label: "Quoted", icon: DollarSign },
    { key: "in_production", label: "In Production", icon: Loader2 },
    { key: "deployed", label: "Deployed", icon: CheckCircle },
];

const statusOrder = ["none", "requested", "quoted", "accepted", "in_production", "completed", "deployed"];

async function getProjectWithRequest(projectId: string, orgId: string) {
    await connectDB();
    
    const project = await Project.findOne({ _id: projectId, orgId }).lean();
    if (!project) return null;
    
    const request = await ProductionRequest.findOne({ projectId })
        .sort({ createdAt: -1 })
        .lean();
    
    return { project, request };
}

export default async function ProjectTrackingPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    const { id } = await params;
    
    if (!userId || !orgId) {
        redirect("/sign-in");
    }

    const data = await getProjectWithRequest(id, orgId);
    
    if (!data || !data.project) {
        notFound();
    }

    const { project, request } = data as { project: any; request: any };
    
    // If no request exists, redirect to projects
    if (!request) {
        redirect(`/dashboard/projects/${id}/builder`);
    }

    const currentStatusIndex = statusOrder.indexOf(request.status);
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
                    <Link href="/dashboard/projects">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        Production Request Tracking
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href={`/dashboard/projects/${id}/builder`}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Open Builder
                    </Link>
                </Button>
            </div>

            {/* Progress Steps */}
            <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center justify-between">
                    {statusSteps.map((step, index) => {
                        const stepIndex = statusOrder.indexOf(step.key);
                        const isCompleted = currentStatusIndex >= stepIndex;
                        const isCurrent = request.status === step.key || 
                            (step.key === "in_production" && request.status === "accepted");
                        const IconComponent = step.icon;
                        
                        return (
                            <div key={step.key} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                    <div className={`
                                        flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all
                                        ${isCompleted 
                                            ? "border-green-500 bg-green-500 text-white" 
                                            : isCurrent 
                                                ? "border-violet-500 bg-violet-50 text-violet-600 dark:bg-violet-950" 
                                                : "border-muted bg-muted/50 text-muted-foreground"
                                        }
                                    `}>
                                        <IconComponent className={`h-5 w-5 ${isCurrent && step.key === "in_production" ? "animate-spin" : ""}`} />
                                    </div>
                                    <span className={`mt-2 text-xs font-medium ${isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                                        {step.label}
                                    </span>
                                </div>
                                {index < statusSteps.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-3 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quote Card - Show when quoted */}
                    {request.quote && (
                        <div className="rounded-xl border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">
                                    Quote Received
                                </h2>
                            </div>
                            
                            <div className="grid gap-4 sm:grid-cols-3 mb-4">
                                <div>
                                    <p className="text-sm text-green-700 dark:text-green-300">Amount</p>
                                    <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                                        ${request.quote.amount}
                                        <span className="text-lg font-normal ml-1">{request.quote.currency}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-green-700 dark:text-green-300">Estimated Time</p>
                                    <p className="text-xl font-semibold text-green-800 dark:text-green-200">
                                        {request.quote.estimatedDays} {request.quote.estimatedDays === 1 ? "day" : "days"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-green-700 dark:text-green-300">Quote Date</p>
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                        {new Date(request.quote.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {request.quote.description && (
                                <div className="mb-4">
                                    <p className="text-sm text-green-700 dark:text-green-300 mb-1">Details</p>
                                    <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                                        {request.quote.description}
                                    </p>
                                </div>
                            )}

                            {/* Quote Response Actions */}
                            {request.status === "quoted" && (
                                <QuoteResponseForm requestId={request._id.toString()} projectId={id} />
                            )}

                            {request.status === "accepted" || request.status === "in_progress" ? (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        Work in progress! We're building your project.
                                    </span>
                                </div>
                            ) : null}

                            {request.status === "completed" || request.status === "deployed" ? (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900">
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Your project has been completed and deployed! 🎉
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Request Details */}
                    <div className="rounded-xl border bg-card p-6">
                        <h2 className="font-semibold mb-4 flex items-center gap-2">
                            <FileCode className="h-4 w-4" />
                            Your Request
                        </h2>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap text-muted-foreground">
                                {request.description}
                            </p>
                        </div>
                    </div>

                    {/* Contact Support */}
                    <div className="rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950 p-6">
                        <h2 className="font-semibold mb-2 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Need to Discuss?
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Have questions about the quote or want to discuss your project requirements? 
                            Chat with us directly on Telegram for real-time communication.
                        </p>
                        <Button asChild className="gap-2">
                            <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="h-4 w-4" />
                                Chat on Telegram
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold">Request Status</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Current Status</p>
                                <Badge className="mt-1 capitalize">
                                    {request.status.replace("_", " ")}
                                </Badge>
                            </div>
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
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Timeline
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Requested</span>
                                <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                            {request.quote && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Quoted</span>
                                    <span>{new Date(request.quote.createdAt).toLocaleDateString()}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Last Updated</span>
                                <span>{new Date(request.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Project Quick Info */}
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h2 className="font-semibold">Project Info</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Files</p>
                                <p className="font-medium">{project.files?.length || 0} files</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Project Status</p>
                                <Badge variant="secondary" className="capitalize">
                                    {project.status}
                                </Badge>
                            </div>
                        </div>
                        <Button asChild variant="outline" className="w-full gap-2">
                            <Link href={`/dashboard/projects/${id}/builder`}>
                                <ExternalLink className="h-4 w-4" />
                                View in Builder
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

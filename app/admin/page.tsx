import connectDB from "@/lib/db";
import ProductionRequest from "@/models/ProductionRequest";
import Project from "@/models/Project";
import { Rocket, FolderKanban, Clock, CheckCircle2, DollarSign } from "lucide-react";

async function getStats() {
    await connectDB();
    
    const [
        totalRequests,
        pendingRequests,
        quotedRequests,
        inProgressRequests,
        completedRequests,
        totalProjects,
    ] = await Promise.all([
        ProductionRequest.countDocuments(),
        ProductionRequest.countDocuments({ status: "pending" }),
        ProductionRequest.countDocuments({ status: "quoted" }),
        ProductionRequest.countDocuments({ status: "in_progress" }),
        ProductionRequest.countDocuments({ status: "completed" }),
        Project.countDocuments(),
    ]);

    const recentRequests = await ProductionRequest.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    return {
        totalRequests,
        pendingRequests,
        quotedRequests,
        inProgressRequests,
        completedRequests,
        totalProjects,
        recentRequests,
    };
}

export default async function AdminDashboard() {
    const stats = await getStats();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    Overview of production requests and projects.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
                            <Rocket className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pending Requests</p>
                            <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                        </div>
                    </div>
                </div>
                
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
                            <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Quoted</p>
                            <p className="text-2xl font-bold">{stats.quotedRequests}</p>
                        </div>
                    </div>
                </div>
                
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                            <p className="text-2xl font-bold">{stats.inProgressRequests}</p>
                        </div>
                    </div>
                </div>
                
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold">{stats.completedRequests}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Requests */}
            <div className="rounded-xl border bg-card">
                <div className="border-b p-4">
                    <h2 className="font-semibold">Recent Requests</h2>
                </div>
                <div className="divide-y">
                    {stats.recentRequests.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No requests yet
                        </div>
                    ) : (
                        stats.recentRequests.map((request: any) => (
                            <div key={request._id} className="flex items-center justify-between p-4">
                                <div>
                                    <p className="font-medium">{request.projectName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {request.userName} • {request.userEmail}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                        request.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                                        request.status === "quoted" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                                        request.status === "in_progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                                        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                    }`}>
                                        {request.status.replace("_", " ")}
                                    </span>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(request.createdAt).toLocaleDateString()}
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

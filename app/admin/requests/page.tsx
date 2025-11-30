import connectDB from "@/lib/db";
import ProductionRequest from "@/models/ProductionRequest";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MessageCircle, DollarSign, ExternalLink } from "lucide-react";

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    reviewing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    quoted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
};

const budgetLabels: Record<string, string> = {
    under_500: "Under $500",
    "500_1000": "$500 - $1,000",
    "1000_2500": "$1,000 - $2,500",
    "2500_5000": "$2,500 - $5,000",
    "5000_plus": "$5,000+",
    need_quote: "Needs Quote",
};

async function getRequests() {
    await connectDB();
    const requests = await ProductionRequest.find()
        .sort({ createdAt: -1 })
        .lean();
    return requests;
}

export default async function RequestsPage() {
    const requests = await getRequests();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Production Requests</h1>
                    <p className="text-sm text-muted-foreground">
                        Review and manage user requests for production help.
                    </p>
                </div>
            </div>

            {/* Requests Table */}
            <div className="rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Project
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Budget
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Priority
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                        No production requests yet
                                    </td>
                                </tr>
                            ) : (
                                requests.map((request: any) => (
                                    <tr key={request._id} className="hover:bg-muted/50">
                                        <td className="px-4 py-4">
                                            <div>
                                                <p className="font-medium">{request.projectName}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                                                    {request.description}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div>
                                                <p className="text-sm">{request.userName}</p>
                                                <p className="text-xs text-muted-foreground">{request.userEmail}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm">
                                                {budgetLabels[request.budgetRange] || request.budgetRange}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge className={priorityColors[request.priority]}>
                                                {request.priority}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge className={statusColors[request.status]}>
                                                {request.status.replace("_", " ")}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-muted-foreground">
                                            {new Date(request.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button asChild variant="ghost" size="icon-sm">
                                                    <Link href={`/admin/requests/${request._id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button asChild variant="ghost" size="icon-sm">
                                                    <Link href={`/dashboard/projects/${request.projectId}/builder`} target="_blank">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {request.telegramContact && (
                                                    <Button asChild variant="ghost" size="icon-sm">
                                                        <a href={`https://t.me/${request.telegramContact}`} target="_blank">
                                                            <MessageCircle className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

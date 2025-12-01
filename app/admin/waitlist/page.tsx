"use client";

import { useState, useEffect } from "react";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    Clock,
    CheckCircle2,
    XCircle,
    Users,
    MoreVertical,
    Mail,
    Calendar,
    Building2,
    RefreshCw,
    Search,
    Trash2,
    UserCheck,
    UserX,
} from "lucide-react";

interface ClerkDetails {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    createdAt: number;
    lastActiveAt: number | null;
}

interface UserStatusData {
    _id: string;
    clerkUserId: string;
    email: string;
    status: "waiting" | "approved" | "rejected";
    pendingOrgId?: string;
    pendingOrgName?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    invitedToOrgs: string[];
    createdOrgsCount: number;
    adminNotes?: string;
    createdAt: string;
    updatedAt: string;
    clerkDetails: ClerkDetails | null;
}

interface Stats {
    waiting: number;
    approved: number;
    rejected: number;
    total: number;
}

export default function WaitlistPage() {
    const [users, setUsers] = useState<UserStatusData[]>([]);
    const [stats, setStats] = useState<Stats>({ waiting: 0, approved: 0, rejected: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>("waiting");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Dialog states
    const [selectedUser, setSelectedUser] = useState<UserStatusData | null>(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<"approve" | "reject" | "delete" | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [adminNotes, setAdminNotes] = useState("");
    const [processing, setProcessing] = useState(false);

    const fetchUsers = async (status?: string) => {
        setLoading(true);
        try {
            const statusParam = status && status !== "all" ? `?status=${status}` : "";
            const res = await fetch(`/api/admin/waitlist${statusParam}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setUsers(data.users);
            setStats(data.stats);
        } catch (error) {
            toast.error("Failed to load waitlist");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(activeTab === "all" ? undefined : activeTab);
    }, [activeTab]);

    const openActionDialog = (user: UserStatusData, action: "approve" | "reject" | "delete") => {
        setSelectedUser(user);
        setActionType(action);
        setRejectionReason("");
        setAdminNotes(user.adminNotes || "");
        setActionDialogOpen(true);
    };

    const handleAction = async () => {
        if (!selectedUser || !actionType) return;

        setProcessing(true);
        try {
            if (actionType === "delete") {
                const res = await fetch(`/api/admin/waitlist/${selectedUser.clerkUserId}`, {
                    method: "DELETE",
                });
                if (!res.ok) throw new Error("Failed to delete");
                toast.success("User removed from waitlist");
            } else {
                const res = await fetch(`/api/admin/waitlist/${selectedUser.clerkUserId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: actionType,
                        reason: rejectionReason,
                        adminNotes,
                    }),
                });
                if (!res.ok) throw new Error("Failed to update");
                toast.success(actionType === "approve" ? "User approved" : "User rejected");
            }

            setActionDialogOpen(false);
            fetchUsers(activeTab === "all" ? undefined : activeTab);
        } catch (error) {
            toast.error("Action failed");
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const search = searchQuery.toLowerCase();
        return (
            user.email.toLowerCase().includes(search) ||
            user.clerkDetails?.firstName?.toLowerCase().includes(search) ||
            user.clerkDetails?.lastName?.toLowerCase().includes(search) ||
            user.pendingOrgName?.toLowerCase().includes(search)
        );
    });

    const statusColors = {
        waiting: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };

    const statusIcons = {
        waiting: Clock,
        approved: CheckCircle2,
        rejected: XCircle,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Waitlist</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage user access requests
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fetchUsers(activeTab === "all" ? undefined : activeTab)}
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.waiting}</p>
                                <p className="text-sm text-muted-foreground">Waiting</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.approved}</p>
                                <p className="text-sm text-muted-foreground">Approved</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.rejected}</p>
                                <p className="text-sm text-muted-foreground">Rejected</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-sm text-muted-foreground">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList>
                        <TabsTrigger value="waiting" className="gap-2">
                            <Clock className="h-4 w-4" />
                            Waiting
                            {stats.waiting > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {stats.waiting}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="approved">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approved
                        </TabsTrigger>
                        <TabsTrigger value="rejected">
                            <XCircle className="h-4 w-4 mr-2" />
                            Rejected
                        </TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-64"
                    />
                </div>
            </div>

            {/* Users List */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="divide-y">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="p-4 flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                    <Skeleton className="h-6 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">
                                {searchQuery ? "No users match your search" : "No users in this category"}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredUsers.map((user) => {
                                const StatusIcon = statusIcons[user.status];
                                return (
                                    <div key={user._id} className="p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            {/* Avatar */}
                                            {user.clerkDetails?.imageUrl ? (
                                                <img
                                                    src={user.clerkDetails.imageUrl}
                                                    alt=""
                                                    className="h-10 w-10 rounded-full"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                    <Users className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium truncate">
                                                        {user.clerkDetails?.firstName} {user.clerkDetails?.lastName}
                                                    </p>
                                                    <Badge className={statusColors[user.status]}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {user.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {user.email}
                                                    </span>
                                                    {user.pendingOrgName && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="h-3 w-3" />
                                                            {user.pendingOrgName}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(user.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {user.status !== "approved" && (
                                                        <DropdownMenuItem
                                                            onClick={() => openActionDialog(user, "approve")}
                                                        >
                                                            <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                                                            Approve
                                                        </DropdownMenuItem>
                                                    )}
                                                    {user.status !== "rejected" && (
                                                        <DropdownMenuItem
                                                            onClick={() => openActionDialog(user, "reject")}
                                                        >
                                                            <UserX className="h-4 w-4 mr-2 text-red-600" />
                                                            Reject
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => openActionDialog(user, "delete")}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Remove
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* Additional Info */}
                                        {(user.rejectionReason || user.adminNotes) && (
                                            <div className="mt-3 ml-14 pl-4 border-l-2 border-muted">
                                                {user.rejectionReason && (
                                                    <p className="text-sm text-red-600 dark:text-red-400">
                                                        Reason: {user.rejectionReason}
                                                    </p>
                                                )}
                                                {user.adminNotes && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Notes: {user.adminNotes}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Dialog */}
            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === "approve" && "Approve User"}
                            {actionType === "reject" && "Reject User"}
                            {actionType === "delete" && "Remove User"}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === "approve" && `Approve ${selectedUser?.email} to access the platform.`}
                            {actionType === "reject" && `Reject ${selectedUser?.email}'s access request.`}
                            {actionType === "delete" && `Remove ${selectedUser?.email} from the waitlist.`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {actionType === "reject" && (
                            <div className="space-y-2">
                                <Label htmlFor="reason">Rejection Reason</Label>
                                <Input
                                    id="reason"
                                    placeholder="Optional reason..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                        )}

                        {actionType !== "delete" && (
                            <div className="space-y-2">
                                <Label htmlFor="notes">Admin Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Internal notes..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        )}

                        {actionType === "delete" && (
                            <p className="text-sm text-muted-foreground">
                                This will remove the user from the waitlist. They can sign up again.
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setActionDialogOpen(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={actionType === "approve" ? "default" : "destructive"}
                            onClick={handleAction}
                            disabled={processing}
                        >
                            {processing ? "Processing..." : (
                                actionType === "approve" ? "Approve" :
                                actionType === "reject" ? "Reject" :
                                "Remove"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

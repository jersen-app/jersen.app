import mongoose, { Schema, model, models } from "mongoose";

export type UserStatusType = "waiting" | "approved" | "rejected";

export interface IUserStatus {
    clerkUserId: string;
    email: string;
    status: UserStatusType;
    // Organization they created (pending approval) - only one allowed
    pendingOrgId?: string;
    pendingOrgName?: string;
    // If approved, who approved and when
    approvedBy?: string;
    approvedAt?: Date;
    // If rejected, who rejected, when, and why
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
    // Invited to join organizations (bypasses waitlist)
    invitedToOrgs: string[];
    // Track how many orgs user has created
    createdOrgsCount: number;
    // Notes from admin
    adminNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserStatusSchema = new Schema<IUserStatus>(
    {
        clerkUserId: {
            type: String,
            required: [true, "Clerk User ID is required"],
            unique: true,
            index: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["waiting", "approved", "rejected"],
            default: "waiting",
        },
        pendingOrgId: {
            type: String,
            default: undefined,
        },
        pendingOrgName: {
            type: String,
            default: undefined,
        },
        approvedBy: {
            type: String,
            default: undefined,
        },
        approvedAt: {
            type: Date,
            default: undefined,
        },
        rejectedBy: {
            type: String,
            default: undefined,
        },
        rejectedAt: {
            type: Date,
            default: undefined,
        },
        rejectionReason: {
            type: String,
            default: undefined,
        },
        invitedToOrgs: {
            type: [String],
            default: [],
        },
        createdOrgsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        adminNotes: {
            type: String,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

// Index for common queries
UserStatusSchema.index({ status: 1 });
UserStatusSchema.index({ email: 1 });

const UserStatus =
    models.UserStatus || model<IUserStatus>("UserStatus", UserStatusSchema);

export default UserStatus;

// Helper to get or create user status
export async function getUserStatus(clerkUserId: string, email?: string): Promise<IUserStatus | null> {
    const status = await UserStatus.findOne({ clerkUserId }).lean();
    if (status) {
        return status as IUserStatus;
    }
    return null;
}

// Helper to create initial waiting status for new user
export async function createWaitingUser(
    clerkUserId: string,
    email: string,
    pendingOrgName?: string
): Promise<IUserStatus> {
    const existing = await UserStatus.findOne({ clerkUserId });
    if (existing) {
        return existing.toObject();
    }
    
    const userStatus = await UserStatus.create({
        clerkUserId,
        email,
        status: "waiting",
        pendingOrgName,
        createdOrgsCount: 0,
    });
    
    return userStatus.toObject();
}

// Check if user can access the platform
export async function canUserAccessPlatform(clerkUserId: string): Promise<{
    canAccess: boolean;
    status: UserStatusType | null;
    reason?: string;
}> {
    const status = await UserStatus.findOne({ clerkUserId }).lean() as IUserStatus | null;
    
    // If no status record, user hasn't signed up yet
    if (!status) {
        return { canAccess: false, status: null, reason: "not_registered" };
    }
    
    // Approved users can access
    if (status.status === "approved") {
        return { canAccess: true, status: "approved" };
    }
    
    // Users with org invitations can access (even if waiting)
    if (status.invitedToOrgs && status.invitedToOrgs.length > 0) {
        return { canAccess: true, status: status.status };
    }
    
    // Waiting users cannot access
    if (status.status === "waiting") {
        return { canAccess: false, status: "waiting", reason: "pending_approval" };
    }
    
    // Rejected users cannot access
    if (status.status === "rejected") {
        return { canAccess: false, status: "rejected", reason: status.rejectionReason || "rejected" };
    }
    
    return { canAccess: false, status: status.status };
}

// Check if user can create an organization
export async function canUserCreateOrg(clerkUserId: string, maxOrgsPerUser: number): Promise<{
    canCreate: boolean;
    reason?: string;
}> {
    const status = await UserStatus.findOne({ clerkUserId }).lean() as IUserStatus | null;
    
    if (!status) {
        return { canCreate: false, reason: "User not found" };
    }
    
    // Check if user has already created max orgs
    if (status.createdOrgsCount >= maxOrgsPerUser) {
        return { 
            canCreate: false, 
            reason: `You can only create ${maxOrgsPerUser} organization${maxOrgsPerUser > 1 ? 's' : ''}` 
        };
    }
    
    // Check if user has a pending org already
    if (status.pendingOrgId) {
        return { 
            canCreate: false, 
            reason: "You already have a pending organization awaiting approval" 
        };
    }
    
    return { canCreate: true };
}

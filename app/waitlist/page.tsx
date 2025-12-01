import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectToDatabase from "@/lib/db";
import UserStatus, { canUserAccessPlatform, createWaitingUser } from "@/models/UserStatus";
import { getPlatformSettings } from "@/models/PlatformSettings";
import { SignOutButton } from "@clerk/nextjs";
import { Clock, Mail, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function WaitlistPage() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        redirect("/");
    }

    await connectToDatabase();
    
    const platformSettings = await getPlatformSettings();
    
    // If public signup is allowed, redirect to dashboard
    if (platformSettings.allowPublicSignup) {
        redirect("/dashboard");
    }

    // Get or create user status
    let userStatus = await UserStatus.findOne({ clerkUserId: userId });
    const email = user.emailAddresses[0]?.emailAddress || "";
    
    if (!userStatus) {
        // First time visiting - add to waitlist
        userStatus = await UserStatus.create({
            clerkUserId: userId,
            email,
            status: "waiting",
            createdOrgsCount: 0,
        });
    }

    // Check if user can access (approved or has org invites)
    const accessCheck = await canUserAccessPlatform(userId);
    if (accessCheck.canAccess) {
        redirect("/dashboard");
    }

    const status = userStatus.status;
    const isRejected = status === "rejected";

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                    {/* Status Icon */}
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
                        isRejected 
                            ? "bg-red-100 dark:bg-red-900/30" 
                            : "bg-amber-100 dark:bg-amber-900/30"
                    }`}>
                        {isRejected ? (
                            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        ) : (
                            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {isRejected ? "Access Denied" : "You're on the Waitlist"}
                    </h1>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {isRejected ? (
                            <>
                                Unfortunately, your access request was not approved.
                                {userStatus.rejectionReason && (
                                    <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                                        Reason: {userStatus.rejectionReason}
                                    </span>
                                )}
                            </>
                        ) : (
                            "Thanks for signing up! We're reviewing your request and will notify you when your account is ready."
                        )}
                    </p>

                    {/* User Info */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            {user.imageUrl ? (
                                <img 
                                    src={user.imageUrl} 
                                    alt="" 
                                    className="w-10 h-10 rounded-full"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <Mail className="h-5 w-5 text-gray-500" />
                                </div>
                            )}
                            <div className="text-left">
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {email}
                                </p>
                            </div>
                        </div>
                        
                        {userStatus.pendingOrgName && (
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <Building2 className="h-4 w-4" />
                                <span>Requested org: <strong>{userStatus.pendingOrgName}</strong></span>
                            </div>
                        )}
                    </div>

                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
                        isRejected
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                        {isRejected ? (
                            <>
                                <XCircle className="h-4 w-4" />
                                Request Denied
                            </>
                        ) : (
                            <>
                                <Clock className="h-4 w-4" />
                                Pending Review
                            </>
                        )}
                    </div>

                    {/* What's Next */}
                    {!isRejected && (
                        <div className="text-left bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                What happens next?
                            </h3>
                            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>Our team will review your request</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>You'll receive an email when approved</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>Or get invited to join an existing organization</span>
                                </li>
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <SignOutButton>
                            <Button variant="outline" className="w-full">
                                Sign Out
                            </Button>
                        </SignOutButton>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                            Signed up on {new Date(userStatus.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

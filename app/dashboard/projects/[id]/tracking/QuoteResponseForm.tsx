"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MessageCircle } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TELEGRAM_LINK = "https://t.me/jersenteam";

interface QuoteResponseFormProps {
    requestId: string;
    projectId: string;
}

export default function QuoteResponseForm({ requestId, projectId }: QuoteResponseFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    async function handleAccept() {
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/production-requests/${requestId}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "accept" }),
            });

            if (!response.ok) {
                throw new Error("Failed to accept quote");
            }

            router.refresh();
        } catch (error) {
            alert("Failed to accept quote. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDecline() {
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/production-requests/${requestId}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "decline" }),
            });

            if (!response.ok) {
                throw new Error("Failed to decline quote");
            }

            router.refresh();
        } catch (error) {
            alert("Failed to decline quote. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-green-200 dark:border-green-800">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button 
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                        disabled={isSubmitting}
                    >
                        <CheckCircle className="h-4 w-4" />
                        Accept Quote
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Accept this quote?</AlertDialogTitle>
                        <AlertDialogDescription>
                            By accepting this quote, you agree to proceed with the development work. 
                            Our team will begin working on your project shortly. 
                            We'll contact you via Telegram to coordinate payment and project details.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
                            Yes, Accept Quote
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Button 
                asChild
                variant="outline" 
                className="gap-2"
            >
                <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    Negotiate
                </a>
            </Button>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button 
                        variant="ghost" 
                        className="gap-2 text-muted-foreground hover:text-destructive"
                        disabled={isSubmitting}
                    >
                        <XCircle className="h-4 w-4" />
                        Decline
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Decline this quote?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to decline this quote? 
                            You can always submit a new request later or contact us to discuss different options.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDecline} className="bg-destructive hover:bg-destructive/90">
                            Yes, Decline Quote
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

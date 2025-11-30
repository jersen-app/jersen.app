"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Send, Save, CheckCircle, XCircle } from "lucide-react";

interface RequestActionsFormProps {
    requestId: string;
    currentStatus: string;
    projectId: string;
}

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "reviewing", label: "Reviewing" },
    { value: "quoted", label: "Quoted" },
    { value: "accepted", label: "Accepted" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "rejected", label: "Rejected" },
];

export default function RequestActionsForm({ 
    requestId, 
    currentStatus,
    projectId 
}: RequestActionsFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showQuoteForm, setShowQuoteForm] = useState(false);
    const [status, setStatus] = useState(currentStatus);
    const [adminNotes, setAdminNotes] = useState("");
    const [quote, setQuote] = useState({
        amount: "",
        currency: "USD",
        description: "",
        estimatedDays: "",
    });

    async function handleStatusUpdate() {
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/admin/requests/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, adminNotes }),
            });
            
            if (!response.ok) throw new Error("Failed to update");
            router.refresh();
        } catch (error) {
            alert("Failed to update request");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleSendQuote() {
        if (!quote.amount || !quote.estimatedDays) {
            alert("Please fill in amount and estimated days");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/admin/requests/${requestId}/quote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...quote,
                    amount: parseFloat(quote.amount),
                    estimatedDays: parseInt(quote.estimatedDays),
                }),
            });
            
            if (!response.ok) throw new Error("Failed to send quote");
            setShowQuoteForm(false);
            router.refresh();
        } catch (error) {
            alert("Failed to send quote");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="rounded-xl border bg-card p-6 space-y-6">
            <h2 className="font-semibold">Actions</h2>

            {/* Status Update */}
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label>Admin Notes</Label>
                    <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Internal notes about this request..."
                        rows={3}
                    />
                </div>

                <Button onClick={handleStatusUpdate} disabled={isSubmitting} className="gap-2">
                    <Save className="h-4 w-4" />
                    Update Status
                </Button>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Quote Section */}
            {!showQuoteForm ? (
                <Button onClick={() => setShowQuoteForm(true)} variant="outline" className="gap-2">
                    <Send className="h-4 w-4" />
                    Send Quote
                </Button>
            ) : (
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">Send Quote to User</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Amount ($)</Label>
                            <Input
                                type="number"
                                value={quote.amount}
                                onChange={(e) => setQuote({ ...quote, amount: e.target.value })}
                                placeholder="500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select value={quote.currency} onValueChange={(v) => setQuote({ ...quote, currency: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Estimated Days</Label>
                            <Input
                                type="number"
                                value={quote.estimatedDays}
                                onChange={(e) => setQuote({ ...quote, estimatedDays: e.target.value })}
                                placeholder="7"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Quote Details</Label>
                        <Textarea
                            value={quote.description}
                            onChange={(e) => setQuote({ ...quote, description: e.target.value })}
                            placeholder="Describe what's included in this quote..."
                            rows={3}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSendQuote} disabled={isSubmitting} className="gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Send Quote
                        </Button>
                        <Button variant="ghost" onClick={() => setShowQuoteForm(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

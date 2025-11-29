import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/actions/api-keys";
import connectToDatabase from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import ChatInterface from "@/components/ChatInterface";
import CodeEditor from "@/components/CodeEditor";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const project = await getProjectById(id);

    if (!project) {
        notFound();
    }

    // Get latest assistant message with files
    await connectToDatabase();
    const messages = await ChatMessage.find({
        projectId: id,
        role: "assistant",
        files: { $exists: true, $ne: {} }
    }).sort({ createdAt: -1 }).limit(1);

    const latestFiles = messages[0]?.files || {};
    const files = Object.entries(latestFiles).map(([path, content]) => ({
        path,
        content: content as string,
    }));

    return (
        <div className="flex h-screen flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950 sm:px-4 sm:py-3">
                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        href="/dashboard/projects"
                        className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="truncate font-semibold text-gray-900 dark:text-white">{project.name}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">AI Builder</p>
                    </div>
                </div>
                <Link
                    href={`/dashboard/projects/${id}/settings`}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 sm:gap-2 sm:px-3"
                >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                </Link>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Chat panel */}
                <div className="h-1/2 w-full border-b border-gray-200 dark:border-gray-800 lg:h-full lg:w-[400px] lg:min-w-[320px] lg:max-w-[480px] lg:border-b-0 lg:border-r xl:w-[420px]">
                    <ChatInterface projectId={id} />
                </div>

                {/* Code editor */}
                <div className="h-1/2 flex-1 lg:h-full">
                    <CodeEditor files={files} projectId={id} />
                </div>
            </div>
        </div>
    );
}

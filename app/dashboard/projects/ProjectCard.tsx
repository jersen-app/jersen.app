"use client";

import Link from "next/link";
import { Rocket, Settings, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductionRequestButton } from "@/components/projects";

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    planning: { bg: "bg-slate-50 dark:bg-slate-900", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
    "in-progress": { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
    completed: { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
};

const productionStatusConfig: Record<string, { label: string; color: string }> = {
    none: { label: "", color: "" },
    requested: { label: "Requested", color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
    quoted: { label: "Quoted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    in_production: { label: "In Production", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    deployed: { label: "Deployed", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
};

interface ProjectCardProps {
    project: {
        _id: string;
        name: string;
        description?: string;
        status: string;
        productionStatus?: string;
        createdAt: string | Date;
    };
}

export function ProjectCard({ project }: ProjectCardProps) {
    const status = statusColors[project.status] || statusColors.planning;
    const productionStatus = productionStatusConfig[project.productionStatus || "none"];

    return (
        <Link
            href={`/dashboard/projects/${project._id}/builder`}
            className="group relative flex flex-col rounded-xl border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/50"
        >
            {/* Color accent bar */}
            <div className={`h-1 ${status.dot}`} />
            
            {/* Card Content */}
            <div className="p-4 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className={`${status.bg} ${status.text} text-[10px] font-medium`}>
                        {project.status.replace("-", " ").toUpperCase()}
                    </Badge>
                    {productionStatus.label && (
                        <Badge className={`${productionStatus.color} text-[10px]`} variant="secondary">
                            <Rocket className="h-3 w-3 mr-1" />
                            {productionStatus.label}
                        </Badge>
                    )}
                </div>
                
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {project.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {project.description || "No description provided."}
                </p>
            </div>

            {/* Card Footer */}
            <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    })}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                    <ProductionRequestButton 
                        projectId={project._id.toString()} 
                        projectName={project.name}
                        productionStatus={project.productionStatus || "none"}
                    />
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                        <Link href={`/dashboard/projects/${project._id}/settings`}>
                            <Settings className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>
            </div>
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </Link>
    );
}

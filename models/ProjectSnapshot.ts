import mongoose, { Schema, model, models } from "mongoose";
import { IProjectFile } from "./Project";

export interface IProjectSnapshot {
    projectId: string;
    name: string;
    files: IProjectFile[];
    createdAt: Date;
}

const ProjectSnapshotSchema = new Schema<IProjectSnapshot>(
    {
        projectId: {
            type: String,
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        files: [
            {
                path: { type: String, required: true },
                content: { type: String, required: true },
                updatedAt: { type: Date, default: Date.now },
                _id: false,
            },
        ],
        createdAt: {
            type: Date,
            default: Date.now,
        },
    }
);

// Prevent duplicate compilation
const ProjectSnapshot = models.ProjectSnapshot || model<IProjectSnapshot>("ProjectSnapshot", ProjectSnapshotSchema);

export default ProjectSnapshot;

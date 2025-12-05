import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import AdmZip from "adm-zip";

// Helper to inject credentials (copied from sandbox/route.ts to avoid circular deps or complex refactoring)
function injectCredentials(
    files: Record<string, string> | Array<{ file: string; data: string }>,
    apiKey: string,
    jersenUrl: string
): any {
    const isArray = Array.isArray(files);
    const result: any = isArray ? [] : {};

    const entries = isArray 
        ? (files as Array<{ file: string; data: string }>).map(f => [f.file, f.data])
        : Object.entries(files as Record<string, string>);

    for (const [path, content] of entries) {
        let newContent = content;
        
        // Replace API Key
        if (newContent.includes('__JERSEN_API_KEY__')) {
            newContent = newContent.replace(/__JERSEN_API_KEY__/g, apiKey);
        }
        
        // Replace Jersen URL
        if (newContent.includes('__JERSEN_URL__')) {
            newContent = newContent.replace(/__JERSEN_URL__/g, jersenUrl);
        }

        if (isArray) {
            (result as Array<{ file: string; data: string }>).push({ file: path, data: newContent });
        } else {
            (result as Record<string, string>)[path] = newContent;
        }
    }

    return result;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id: projectId } = await params;
    await connectToDatabase();

    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
        return new Response("Project not found", { status: 404 });
    }

    // Get Jersen URL (same logic as sandbox)
    let jersenUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    if (!jersenUrl && process.env.VERCEL_URL) {
        jersenUrl = `https://${process.env.VERCEL_URL}`;
    }
    if (!jersenUrl) {
        jersenUrl = "http://localhost:3000";
    }
    // Remove trailing slash
    jersenUrl = jersenUrl.replace(/\/$/, "");

    // Prepare files
    const files: Record<string, string> = {};
    for (const file of project.files) {
        files[file.path] = file.content;
    }

    // Inject credentials
    const processedFiles = injectCredentials(files, project.apiKey || "", jersenUrl);

    // --- INJECT MISSING CONFIG FILES (package.json, tsconfig.json, etc.) ---
    
    // 1. package.json
    const projectDeps: string[] = (project as any).dependencies || [];
    const additionalDeps: Record<string, string> = {};
    for (const dep of projectDeps) {
        if (dep.includes('@') && !dep.startsWith('@')) {
            const [name, version] = dep.split('@');
            additionalDeps[name] = version;
        } else if (dep.startsWith('@')) {
            const parts = dep.split('@').filter(Boolean);
            if (parts.length >= 2 && parts[1].includes('.')) {
                additionalDeps['@' + parts[0]] = parts[1];
            } else {
                additionalDeps['@' + parts[0]] = 'latest';
            }
        } else {
            additionalDeps[dep] = 'latest';
        }
    }

    const defaultDeps: Record<string, string> = {
        "lucide-react": "^0.468.0",
        "tailwindcss": "^4",
        "@tailwindcss/postcss": "^4",
        "tw-animate-css": "^1.2.5",
    };

    if (processedFiles['package.json']) {
        try {
            const existingPkg = JSON.parse(processedFiles['package.json'] as string);
            existingPkg.dependencies = {
                ...existingPkg.dependencies,
                ...defaultDeps,
                ...additionalDeps,
            };
            processedFiles['package.json'] = JSON.stringify(existingPkg, null, 2);
        } catch (e) {
            console.error('Failed to parse existing package.json:', e);
        }
    } else {
        processedFiles['package.json'] = JSON.stringify(
            {
                name: project.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                version: "0.1.0",
                private: true,
                scripts: {
                    dev: "next dev",
                    build: "next build",
                    start: "next start",
                    lint: "next lint",
                },
                dependencies: {
                    next: "16.0.7",
                    react: "19.2.0",
                    "react-dom": "19.2.0",
                    ...defaultDeps,
                    ...additionalDeps,
                },
                devDependencies: {
                    typescript: "^5",
                    "@types/node": "^22",
                    "@types/react": "^19",
                    "@types/react-dom": "^19",
                    "eslint": "^9",
                    "eslint-config-next": "16.0.7",
                },
            },
            null,
            2
        );
    }

    // 2. tsconfig.json
    if (!processedFiles['tsconfig.json']) {
        processedFiles['tsconfig.json'] = JSON.stringify({
            "compilerOptions": {
                "lib": ["dom", "dom.iterable", "esnext"],
                "allowJs": true,
                "skipLibCheck": true,
                "strict": true,
                "noEmit": true,
                "esModuleInterop": true,
                "module": "esnext",
                "moduleResolution": "bundler",
                "resolveJsonModule": true,
                "isolatedModules": true,
                "jsx": "preserve",
                "incremental": true,
                "plugins": [
                    {
                        "name": "next"
                    }
                ],
                "paths": {
                    "@/*": ["./*"]
                }
            },
            "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
            "exclude": ["node_modules"]
        }, null, 2);
    }

    // 3. next.config.ts
    if (!processedFiles['next.config.ts'] && !processedFiles['next.config.js'] && !processedFiles['next.config.mjs']) {
        processedFiles['next.config.ts'] = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;`;
    }

    // 4. postcss.config.mjs (for Tailwind v4)
    if (!processedFiles['postcss.config.mjs']) {
        processedFiles['postcss.config.mjs'] = `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;`;
    }

    // 5. .gitignore
    if (!processedFiles['.gitignore']) {
        processedFiles['.gitignore'] = `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
ts-debug.log*

# local env files
.env*.local

# vercel
.vercel`;
    }

    // 6. next-env.d.ts
    if (!processedFiles['next-env.d.ts']) {
        processedFiles['next-env.d.ts'] = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`;
    }

    // Create ZIP
    const zip = new AdmZip();
    
    for (const [path, content] of Object.entries(processedFiles)) {
        // Remove leading slash if present
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        zip.addFile(cleanPath, Buffer.from(content as string, "utf8"));
    }

    // Add a README
    zip.addFile("README.md", Buffer.from(`# ${project.name}\n\nGenerated by Jersen.app\n\n## Getting Started\n\n1. Install dependencies:\n\`\`\`bash\nnpm install\n# or\npnpm install\n# or\nbun install\n\`\`\`\n\n2. Run development server:\n\`\`\`bash\nnpm run dev\n\`\`\``, "utf8"));

    const zipBuffer = zip.toBuffer();

    return new Response(zipBuffer as unknown as BodyInit, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip"`,
        },
    });
}

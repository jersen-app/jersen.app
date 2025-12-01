"use client";

import { useEffect } from "react";

interface DevToolsBlockerProps {
    enabled: boolean;
}

export default function DevToolsBlocker({ enabled }: DevToolsBlockerProps) {
    useEffect(() => {
        if (!enabled) return;

        // Prevent right-click context menu
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        // Detect DevTools via keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            // F12
            if (e.key === "F12") {
                e.preventDefault();
                window.location.reload();
                return false;
            }

            // Ctrl+Shift+I (Chrome DevTools)
            if (e.ctrlKey && e.shiftKey && e.key === "I") {
                e.preventDefault();
                window.location.reload();
                return false;
            }

            // Ctrl+Shift+J (Chrome Console)
            if (e.ctrlKey && e.shiftKey && e.key === "J") {
                e.preventDefault();
                window.location.reload();
                return false;
            }

            // Ctrl+Shift+C (Chrome Inspect Element)
            if (e.ctrlKey && e.shiftKey && e.key === "C") {
                e.preventDefault();
                window.location.reload();
                return false;
            }

            // Cmd+Option+I (Mac Chrome DevTools)
            if (e.metaKey && e.altKey && e.key === "i") {
                e.preventDefault();
                window.location.reload();
                return false;
            }

            // Cmd+Option+J (Mac Chrome Console)
            if (e.metaKey && e.altKey && e.key === "j") {
                e.preventDefault();
                window.location.reload();
                return false;
            }

            // Cmd+Option+C (Mac Chrome Inspect Element)
            if (e.metaKey && e.altKey && e.key === "c") {
                e.preventDefault();
                window.location.reload();
                return false;
            }

            // Ctrl+U (View Source)
            if (e.ctrlKey && e.key === "u") {
                e.preventDefault();
                return false;
            }

            // Cmd+U (View Source on Mac)
            if (e.metaKey && e.key === "u") {
                e.preventDefault();
                return false;
            }
        };

        // Detect DevTools via debugger statement timing
        let devToolsOpen = false;
        const detectDevTools = () => {
            const start = performance.now();
            // debugger statement takes longer when DevTools is open
            // eslint-disable-next-line no-debugger
            debugger;
            const end = performance.now();
            
            if (end - start > 100) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    window.location.reload();
                }
            } else {
                devToolsOpen = false;
            }
        };

        // Check periodically (less aggressive to avoid performance issues)
        const interval = setInterval(detectDevTools, 2000);

        // Add event listeners
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);

        // Console warning
        console.log(
            "%c⚠️ Warning!",
            "color: red; font-size: 40px; font-weight: bold;"
        );
        console.log(
            "%cThis browser feature is intended for developers. If someone told you to copy-paste something here, it is likely a scam.",
            "color: gray; font-size: 16px;"
        );

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            clearInterval(interval);
        };
    }, [enabled]);

    return null;
}

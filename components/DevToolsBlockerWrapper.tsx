"use client";

import { useEffect, useState } from "react";
import DevToolsBlocker from "./DevToolsBlocker";

export default function DevToolsBlockerWrapper() {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        // Fetch the setting from the API
        fetch("/api/settings/public")
            .then((res) => res.json())
            .then((data) => {
                setEnabled(data.disableDevTools ?? false);
            })
            .catch(() => {
                // On error, don't block (fail open)
                setEnabled(false);
            });
    }, []);

    return <DevToolsBlocker enabled={enabled} />;
}

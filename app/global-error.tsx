// app/global-error.tsx
'use client' // Error components must be Client Components

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("GlobalError Caught:", error);
    }, [error]);

    return (
        <html>
            <head>
                <title>Error</title>
            </head>
            <body>
                <h2>Something went wrong!</h2>
                {/* 
          Avoid rendering complex components here initially,
          especially any that might use context.
        */}
                {/* <p>Error: {error?.message}</p> */}
                <button
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                >
                    Try again
                </button>
            </body>
        </html>
    );
}
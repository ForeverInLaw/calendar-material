// app/not-found.tsx
"use client"; // Important for error pages / pages with minimal interactivity

import Link from 'next/link';

export default function NotFound() {
    return (
        <html>
            <head>
                <title>404 - Page Not Found</title>
            </head>
            <body>
                <div>
                    <h1>404 - Page Not Found</h1>
                    <p>Sorry, the page you are looking for could not be found.</p>
                    <Link href="/">Go back home</Link>
                </div>
            </body>
        </html>
    );
}
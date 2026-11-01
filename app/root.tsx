import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const meta: Route.MetaFunction = () => [
  { title: "A&W Laundry" },
  {
    name: "description",
    content: "Aplikasi manajemen laundry A&W Laundry.",
  },
];

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm font-medium text-slate-600">Memuat A&amp;W Laundry…</p>
    </main>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Terjadi kesalahan";
  let details = "Aplikasi tidak dapat memuat halaman ini.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Terjadi kesalahan";
    details =
      error.status === 404
        ? "Halaman yang Anda cari tidak ditemukan."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900">{message}</h1>
      <p className="mt-3 text-slate-600">{details}</p>
      {stack && (
        <pre className="mt-6 w-full overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

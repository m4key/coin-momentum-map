import { createFileRoute, redirect } from "@tanstack/react-router";
// Keep the former URL safe while Dashboard is disabled.
export const Route = createFileRoute("/dashboard")({ beforeLoad: () => { throw redirect({ to: "/", replace: true }); } });
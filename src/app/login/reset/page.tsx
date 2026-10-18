import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import ResetForm from "./ResetForm";

export const metadata: Metadata = { title: "Set or reset password" };

export default function ResetPage() {
  return (
    <AuthShell title="Set or reset password" subtitle="We'll email you a secure link">
      <ResetForm />
    </AuthShell>
  );
}

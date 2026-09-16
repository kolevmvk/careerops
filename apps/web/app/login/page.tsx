import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server.ts";

/**
 * Sign-ups are disabled in Supabase Auth (SPECIFICATION §10.2), so this is a
 * sign-in form and nothing else. There is no registration path to harden.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function signIn(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (signInError !== null) {
      // The message is deliberately generic: distinguishing "no such account"
      // from "wrong password" tells an attacker which half they got right.
      redirect("/login?error=1");
    }

    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">CareerOps</h1>
      <p className="mt-1 text-sm text-(--color-ink-muted)">Sign in to the cockpit.</p>

      <form action={signIn} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="username"
            className="rounded-md border border-(--color-border-subtle) bg-(--color-surface-raised) px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-(--color-border-subtle) bg-(--color-surface-raised) px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
          />
        </label>

        {error !== undefined ? (
          <p role="alert" className="text-sm text-(--color-danger)">
            Those credentials did not work.
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-2 rounded-md bg-(--color-accent) px-3 py-2 text-sm font-medium text-white"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}

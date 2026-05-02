export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-md text-center space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand)] flex items-center justify-center shadow-md">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Tally
          </h1>
          <p className="text-[var(--color-foreground-muted)] text-base leading-relaxed">
            Track your spending. Understand your runway.<br />
            Stay in control of your money.
          </p>
        </div>

        {/* Sign in card */}
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl p-8 shadow-sm space-y-4">
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Sign in to get started — your data stays private to you.
          </p>

          {/* Google sign-in placeholder — wired up on Day 2 */}
          <button
            className="w-full flex items-center justify-center gap-3 bg-white border border-[var(--color-border-strong)] rounded-xl px-4 py-3 text-[var(--color-foreground)] font-medium text-sm hover:bg-[var(--color-surface)] transition-colors cursor-not-allowed opacity-60"
            disabled
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="text-xs text-[var(--color-foreground-subtle)]">
            Auth wiring coming next — this is the live landing page.
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-[var(--color-foreground-subtle)]">
          Open source · Private data per user · Built with Next.js + Supabase
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

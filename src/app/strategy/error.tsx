"use client";
export default function FunnelError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen grid place-content-center text-center gap-5 p-8">
      <h1 className="font-serif text-3xl">We’ll be right back.</h1>
      <p>We couldn’t load this page. Please try again in a moment.</p>
      <button
        onClick={reset}
        className="bg-[#1a1918] text-white px-6 py-3 rounded"
      >
        Try again
      </button>
    </main>
  );
}

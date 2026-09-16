"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";

function MetaPixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLoadRef = useRef(true);

  useEffect(() => {
    // Avoid duplicate PageView on initial load (the script in <head> already tracked PageView)
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams]);

  return null;
}

export default function MetaPixel() {
  return (
    <Suspense fallback={null}>
      <MetaPixelTracker />
    </Suspense>
  );
}

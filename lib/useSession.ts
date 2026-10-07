"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, homeFor, type Me, type Role } from "./client";

/** Loads the signed-in user. With requiredRole, other roles are sent to their own dashboard; no session goes to /login. */
export function useSession(requiredRole?: Role): Me | null {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ user: Me }>("/api/auth/me")
      .then(({ user }) => {
        if (!alive) return;
        if (requiredRole && user.role !== requiredRole) router.replace(homeFor(user.role));
        else setMe(user);
      })
      .catch(() => router.replace("/login"));
    return () => {
      alive = false;
    };
  }, [requiredRole, router]);

  return me;
}

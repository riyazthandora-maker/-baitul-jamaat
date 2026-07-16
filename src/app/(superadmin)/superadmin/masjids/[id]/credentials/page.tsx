"use client";

import { useEffect, useState } from "react";
import CredentialsModal from "@/components/CredentialsModal";
import { useRouter } from "next/navigation";

interface Credentials {
  phone: string;
  password: string;
  masjidName: string;
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem("bj_credentials");
    if (!raw) {
      router.push("/superadmin/masjids");
      return;
    }
    try {
      setCredentials(JSON.parse(raw));
      sessionStorage.removeItem("bj_credentials");
    } catch {
      router.push("/superadmin/masjids");
    }
  }, [router]);

  if (!credentials) return null;

  return <CredentialsModal credentials={credentials} />;
}

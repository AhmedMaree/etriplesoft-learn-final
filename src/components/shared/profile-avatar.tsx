"use client";

import Image from "next/image";
import { ASSET_BASE } from "@/lib/assets";
import { useStoredValue } from "@/lib/browser/demo-storage";

export function Avatar({ large = false }: { large?: boolean }) {
  const photo = useStoredValue("profile-photo", "");
  return (
    <Image
      className={`avatar ${large ? "large" : ""}`}
      src={photo || ASSET_BASE + "profile-image.png"}
      alt="Ahmed Salah"
      width={143}
      height={143}
      unoptimized={Boolean(photo)}
      loading="eager"
    />
  );
}

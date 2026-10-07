"use client";

import Image from "next/image";
import { ASSET_BASE } from "@/lib/assets";

export function Avatar({ large = false, src, alt = "Learner profile" }: { large?: boolean; src?: string | null; alt?: string }) {
  return (
    <Image
      className={`avatar ${large ? "large" : ""}`}
      src={src || ASSET_BASE + "profile-image.png"}
      alt={alt}
      width={143}
      height={143}
      unoptimized={Boolean(src)}
      loading="eager"
    />
  );
}

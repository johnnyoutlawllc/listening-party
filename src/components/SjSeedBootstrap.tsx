"use client";

import { useEffect } from "react";
import { importSufferingJukeboxSeed } from "@/lib/store";

/** Applies the bundled Suffering Jukebox playlist seed once per seed version. */
export function SjSeedBootstrap() {
  useEffect(() => {
    importSufferingJukeboxSeed(false);
  }, []);
  return null;
}

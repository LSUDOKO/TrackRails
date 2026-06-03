"use client";

import { CinematicFooter } from "@/components/ui/motion-footer";

export default function Footer() {
  return (
    <>
      {/* Spacer to create scroll room for the fixed cinematic footer */}
      <div className="h-[100vh]" />
      <CinematicFooter />
    </>
  );
}

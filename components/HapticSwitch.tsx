"use client";
// Invisible checkbox that covers the control on compact screens so a tap vibrates (module 1946).
import { tapHaptic } from "@/lib/haptic";

export default function HapticSwitch() {
  return (
    <input
      type="checkbox"
      // @ts-expect-error — Safari's switch control attribute
      switch=""
      className="haptic-switch"
      defaultChecked={false}
      aria-hidden="true"
      tabIndex={-1}
      onChange={tapHaptic}
    />
  );
}

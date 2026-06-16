"use client";

import { useState, useEffect } from "react";

export default function AgencyGuidanceBadge() {
  const [isAgency, setIsAgency] = useState(false);

  useEffect(() => {
    setIsAgency(typeof window !== "undefined" && localStorage.getItem("growl_onboarding_source") === "agency");
  }, []);

  if (!isAgency) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-xs flex items-center gap-2">
      <span className="text-amber-500">📢</span>
      <span className="text-amber-800 font-medium">Ad Agency Setup</span>
      <span className="text-gray-500">— Fill in details to generate your agency ads.</span>
    </div>
  );
}

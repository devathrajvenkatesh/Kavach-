"use client";

import React from "react";
import Image from "next/image";

interface KavachLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
  subtitleColor?: string;
}

export function KavachLogo({
  className = "",
  size = 40,
  showText = false,
  textColor = "text-[#052326]",
  subtitleColor = "text-[#678882]",
}: KavachLogoProps) {
  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Image
          src="/kavach-emblem.png"
          alt="Kavach Shield Emblem"
          width={Math.round(size * 2)}
          height={Math.round(size * 2 * (702 / 617))}
          className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(5,35,38,0.08)]"
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-serif tracking-[0.22em] text-lg font-bold leading-tight uppercase ${textColor}`}
          >
            KAVACH
          </span>
          <span
            className={`text-[9px] tracking-[0.2em] font-medium uppercase ${subtitleColor}`}
          >
            Intelligent Protection
          </span>
        </div>
      )}
    </div>
  );
}

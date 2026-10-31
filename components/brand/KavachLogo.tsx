"use client";

import React from "react";

interface KavachLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
  subtitleColor?: string;
}

export function KavachLogo({
  className = "",
  size = 36,
  showText = false,
  textColor = "text-[#052326]",
  subtitleColor = "text-[#678882]",
}: KavachLogoProps) {
  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#052326" />
            <stop offset="100%" stopColor="#2E595A" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E2C992" />
            <stop offset="100%" stopColor="#C9A86A" />
          </linearGradient>
          <linearGradient id="sageGrad" x1="40" y1="20" x2="60" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A5B5A9" />
            <stop offset="100%" stopColor="#678882" />
          </linearGradient>
        </defs>

        {/* Outer Protective Shield Facet (Left) */}
        <path d="M50 12 L22 25 L22 54 C22 72 35 84 50 88 L50 12 Z" fill="#052326" />

        {/* Outer Protective Shield Facet (Right) */}
        <path d="M50 12 L78 25 L78 54 C78 72 65 84 50 88 L50 12 Z" fill="#2E595A" />

        {/* Inner Architectural Facet (Left) */}
        <path d="M50 22 L30 32 L30 52 C30 65 39 74 50 78 L50 22 Z" fill="#2E595A" opacity="0.85" />

        {/* Inner Architectural Facet (Right) */}
        <path d="M50 22 L70 32 L70 52 C70 65 61 74 50 78 L50 22 Z" fill="#678882" opacity="0.85" />

        {/* Central Intelligence Diamond Core (Champagne Gold) */}
        <path d="M50 33 L62 48 L50 63 L38 48 Z" fill="url(#goldGrad)" />

        {/* Inner Core Accent */}
        <circle cx="50" cy="48" r="4.5" fill="#052326" />
        <circle cx="50" cy="48" r="2" fill="#FFFFFF" />

        {/* Defense Network Connectivity Rays */}
        <line x1="50" y1="22" x2="50" y2="33" stroke="#C9A86A" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="63" x2="50" y2="78" stroke="#C9A86A" strokeWidth="2" strokeLinecap="round" />
        <line x1="30" y1="48" x2="38" y2="48" stroke="#A5B5A9" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="62" y1="48" x2="70" y2="48" stroke="#A5B5A9" strokeWidth="1.8" strokeLinecap="round" />

        {/* Corner Security Points */}
        <circle cx="50" cy="12" r="2" fill="#C9A86A" />
        <circle cx="22" cy="25" r="2" fill="#A5B5A9" />
        <circle cx="78" cy="25" r="2" fill="#A5B5A9" />
        <circle cx="50" cy="88" r="2" fill="#C9A86A" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-serif tracking-[0.22em] text-lg font-bold leading-tight uppercase ${textColor}`}>
            KAVACH
          </span>
          <span className={`text-[10px] tracking-[0.18em] font-medium uppercase ${subtitleColor}`}>
            Intelligent Protection
          </span>
        </div>
      )}
    </div>
  );
}

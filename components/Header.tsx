"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Siren, LayoutDashboard, PlusCircle } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-navy border-b border-navy-light/40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-burgundy flex items-center justify-center text-cream shadow-md group-hover:bg-burgundy-light transition">
              <Siren className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-cream tracking-wide flex items-center gap-1">
                CRISIS<span className="text-slate-light">PULSE</span>
              </span>
              <p className="text-[10px] text-slate font-medium tracking-wider uppercase">
                Emergency Response
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                pathname === "/"
                  ? "bg-navy-light text-cream"
                  : "text-cream/80 hover:text-cream hover:bg-navy-light/60"
              }`}
            >
              Overview
            </Link>

            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                pathname.startsWith("/admin")
                  ? "bg-navy-light text-cream"
                  : "text-cream/80 hover:text-cream hover:bg-navy-light/60"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </Link>

            <Link
              href="/report"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-burgundy text-cream hover:bg-burgundy-light active:bg-burgundy-hover shadow-sm transition ml-1"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Report Emergency</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Siren, ShieldAlert, LayoutDashboard, PlusCircle } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 group-hover:bg-red-500 transition">
              <Siren className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
                CRISIS<span className="text-red-500">PULSE</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                Emergency Response System
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                pathname === "/"
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Overview
            </Link>

            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                pathname.startsWith("/admin")
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </Link>

            <Link
              href="/report"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm transition shadow-red-900/30 ml-1"
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


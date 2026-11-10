import Link from "next/link";
import {
  AlertTriangle,
  Flame,
  LayoutDashboard,
  PlusCircle,
  Shield,
  Activity,
  ArrowRight,
  LifeBuoy,
  Clock,
  Radio,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/80 border border-red-800/60 text-red-400 text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
            <Radio className="h-3.5 w-3.5 animate-pulse text-red-400" />
            24/7 Incident Reporting &amp; Active Triage
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
            Emergency Response &amp; <br />
            <span className="text-red-500">Disaster Management</span> Platform
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Report live incidents from the scene, trigger automated algorithmic
            severity classification, and coordinate first responder resources in real time.
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-red-600 px-6 py-4 text-base font-bold text-white hover:bg-red-700 active:bg-red-800 transition shadow-lg shadow-red-600/30 transform hover:-translate-y-0.5"
            >
              <PlusCircle className="h-5 w-5" />
              <span>Report an Emergency</span>
            </Link>

            <Link
              href="/admin"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-slate-800 border border-slate-700 px-6 py-4 text-base font-semibold text-slate-200 hover:text-white hover:bg-slate-700/80 active:bg-slate-800 transition shadow-sm transform hover:-translate-y-0.5"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Admin Dashboard</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900">
            Emergency Incident Reporting &amp; Monitoring
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Built for immediate crisis response, field reliability, and operational visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="h-12 w-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <Flame className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Instant Field Reporting</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Capture emergency type, casualty counts, location, and situational details
              with validation and immediate confirmation.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="h-12 w-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Automated Severity Triage</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Algorithmic classification scores each report based on category baseline,
              people affected, and critical escalation keywords.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Live Command Dashboard</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Real-time incident feed highlighting critical emergencies, dynamic category charts,
              and live status updates for dispatcher teams.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

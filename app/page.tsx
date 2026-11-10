import Link from "next/link";
import {
  Flame,
  LayoutDashboard,
  PlusCircle,
  Shield,
  Activity,
  ArrowRight,
  Radio,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-cream">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate/30">
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cardBg border border-slate/40 text-navy text-xs font-bold tracking-wide uppercase mb-6 shadow-sm">
            <Radio className="h-3.5 w-3.5 text-burgundy animate-pulse" />
            24/7 Incident Reporting &amp; Active Triage
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-navy">
            Emergency Response &amp; <br />
            <span className="text-burgundy">Disaster Management</span> Platform
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-navy/80 max-w-2xl mx-auto font-medium leading-relaxed">
            Report live incidents from the scene, trigger automated algorithmic
            severity classification, and coordinate first responder resources in real time.
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-burgundy px-7 py-4 text-base font-bold text-cream hover:bg-burgundy-light active:bg-burgundy-hover transition shadow-md hover:-translate-y-0.5"
            >
              <PlusCircle className="h-5 w-5" />
              <span>Report an Emergency</span>
            </Link>

            <Link
              href="/admin"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl border-2 border-navy bg-transparent px-7 py-4 text-base font-bold text-navy hover:bg-navy hover:text-cream active:bg-navy-hover transition shadow-sm hover:-translate-y-0.5"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Admin Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-navy">
            Emergency Incident Reporting &amp; Monitoring
          </h2>
          <p className="mt-2 text-sm text-slate-dark font-medium">
            Built for immediate crisis response, field reliability, and operational visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm hover:shadow-md transition">
            <div className="h-12 w-12 rounded-xl bg-burgundy/10 text-burgundy flex items-center justify-center mb-4">
              <Flame className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-navy">Instant Field Reporting</h3>
            <p className="mt-2 text-sm text-navy/80 leading-relaxed font-normal">
              Capture emergency category, casualty counts, location, and situational details
              with validation and immediate confirmation.
            </p>
          </div>

          <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm hover:shadow-md transition">
            <div className="h-12 w-12 rounded-xl bg-navy/10 text-navy flex items-center justify-center mb-4">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-navy">Automated Severity Triage</h3>
            <p className="mt-2 text-sm text-navy/80 leading-relaxed font-normal">
              Algorithmic classification scores each report based on category baseline,
              people affected, and critical escalation keywords.
            </p>
          </div>

          <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm hover:shadow-md transition">
            <div className="h-12 w-12 rounded-xl bg-burgundy/10 text-burgundy flex items-center justify-center mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-navy">Live Command Dashboard</h3>
            <p className="mt-2 text-sm text-navy/80 leading-relaxed font-normal">
              Real-time incident feed highlighting critical emergencies, dynamic category charts,
              and live status updates for dispatcher teams.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

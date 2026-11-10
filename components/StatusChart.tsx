"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface StatusChartProps {
  data: {
    status: string;
    name: string;
    count: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  REPORTED: "#798da6", // slate
  PENDING: "#f59e0b",  // amber
  ASSIGNED: "#8b5cf6", // purple
  IN_PROGRESS: "#3b82f6", // blue
  RESOLVED: "#10b981", // emerald
};

export function StatusChart({ data }: StatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-cardBg rounded-2xl border border-slate/40 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-extrabold text-navy">Incidents by Status</h3>
          <p className="text-xs text-navy/70 font-medium">
            Active operational lifecycle progression
          </p>
        </div>
        <span className="text-xs font-bold text-navy/70 bg-cream px-2.5 py-1 rounded-lg border border-slate/40">
          Total: <span className="font-extrabold text-navy">{total}</span>
        </span>
      </div>

      <div className="h-64 w-full">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-sm font-semibold text-slate">
            No incidents reported yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#798da6" strokeOpacity={0.25} />
              <XAxis
                dataKey="name"
                stroke="#142841"
                fontSize={11}
                fontWeight={600}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                stroke="#142841"
                fontSize={11}
                fontWeight={600}
                allowDecimals={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-navy border border-navy-light text-cream p-2.5 rounded-xl shadow-lg text-xs">
                        <p className="font-bold">{item.name}</p>
                        <p className="text-cream/90 mt-0.5">
                          Incidents: <span className="font-black text-cream">{item.count}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status] || "#490b1a"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}


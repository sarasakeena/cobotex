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

interface CategoryStat {
  category: string;
  name: string;
  count: number;
}

interface CategoryChartProps {
  data: CategoryStat[];
}

// Chart bars in burgundy and slate/navy shades
const CHART_COLORS: Record<string, string> = {
  FIRE: "#490b1a", // burgundy
  ROAD_ACCIDENT: "#142841", // navy
  MEDICAL: "#6e1529", // dark rose/burgundy light
  FLOOD: "#1c385c", // navy light
  BUILDING_COLLAPSE: "#3c0814", // dark burgundy
  OTHER: "#798da6", // slate
};

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = data.map((item) => ({
    name: item.name,
    category: item.category,
    count: item.count,
    color: CHART_COLORS[item.category] || "#490b1a",
  }));

  const totalIncidents = chartData.reduce((acc, curr) => acc + curr.count, 0);

  if (totalIncidents === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate/40 bg-cardBg/50 text-slate-dark">
        <p className="text-sm font-semibold">No category incident data yet</p>
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8cfc0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#142841", fontWeight: 600 }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={50}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#798da6", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl border border-slate/40 bg-cardBg p-3 shadow-lg">
                    <p className="text-xs font-bold text-navy uppercase tracking-wider">
                      {item.name}
                    </p>
                    <p className="text-lg font-black text-burgundy mt-1">
                      {item.count}{" "}
                      <span className="text-xs font-medium text-navy/70">
                        {item.count === 1 ? "incident" : "incidents"}
                      </span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

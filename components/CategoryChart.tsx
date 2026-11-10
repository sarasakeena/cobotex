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

const CATEGORY_COLORS: Record<string, string> = {
  FIRE: "#f97316", // orange
  ROAD_ACCIDENT: "#d97706", // amber
  MEDICAL: "#f43f5e", // rose
  FLOOD: "#3b82f6", // blue
  BUILDING_COLLAPSE: "#9333ea", // purple
  OTHER: "#64748b", // slate
};

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = data.map((item) => ({
    name: item.name,
    category: item.category,
    count: item.count,
    color: CATEGORY_COLORS[item.category] || "#64748b",
  }));

  const totalIncidents = chartData.reduce((acc, curr) => acc + curr.count, 0);

  if (totalIncidents === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400">
        <p className="text-sm font-medium">No category incident data yet</p>
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#64748b" }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={50}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      {item.name}
                    </p>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {item.count}{" "}
                      <span className="text-xs font-normal text-slate-500">
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


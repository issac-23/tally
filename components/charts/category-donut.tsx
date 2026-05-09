"use client";

import { PieChart, Pie, Cell } from "recharts";
import type { CategorySlice } from "@/lib/utils/aggregation";

const CHART_SIZE = 220;

interface CategoryDonutProps {
  slices: CategorySlice[];
}

export function CategoryDonut({ slices }: CategoryDonutProps) {
  const data = slices.map((s) => ({
    name: s.category.name,
    value: s.amount,
    color: s.category.color,
  }));

  return (
    <div className="flex justify-center">
      <PieChart width={CHART_SIZE} height={CHART_SIZE}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={CHART_SIZE * 0.32}
          outerRadius={CHART_SIZE * 0.48}
          paddingAngle={1}
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </div>
  );
}

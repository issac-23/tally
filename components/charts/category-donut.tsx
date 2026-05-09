"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { CategorySlice } from "@/lib/utils/aggregation";

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
    <div className="w-full h-48 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="65%"
            outerRadius="95%"
            paddingAngle={1}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/card";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TruckCharts({
  points,
}: {
  points: Array<{ month: string; spend: number; gallons: number; avgPrice: number | null }>;
}) {
  if (points.length === 0) {
    return <Card>No trend data yet for this truck.</Card>;
  }
  return (
    <Card>
      <h2 className="mb-2 font-semibold">Trends</h2>
      <p className="mb-4 text-sm text-muted">
        Spend, gallons, and average price by month. Cost per mile appears only when odometer miles exist.
      </p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="spend" stroke="#0B1728" name="Spend" />
            <Line type="monotone" dataKey="gallons" stroke="#176BFF" name="Gallons" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 text-sm">
        {points.map((point) => (
          <li key={point.month}>
            {point.month}: spend ${point.spend.toFixed(2)}, {point.gallons.toFixed(1)} gal, avg{" "}
            {point.avgPrice === null ? "unknown" : `$${point.avgPrice.toFixed(3)}`}
          </li>
        ))}
      </ul>
    </Card>
  );
}

"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const GRID = "hsl(var(--border))";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    color: "hsl(var(--card-foreground))",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))", fontSize: 11 },
};

export function VolumeTrendChart({
  data,
}: {
  data: { label: string; actual: number; planned: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={46} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v: number, name) => [
            `${new Intl.NumberFormat("vi-VN").format(v)} m³`,
            name === "actual" ? "Thực tế" : "Kế hoạch",
          ]}
        />
        <Area
          type="monotone"
          dataKey="planned"
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          fill="none"
        />
        <Area
          type="monotone"
          dataKey="actual"
          stroke="hsl(var(--primary))"
          strokeWidth={2.2}
          fill="url(#fillActual)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StationBarChart({
  data,
}: {
  data: { code: string; actual: number; planned: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="code" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={46} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v: number, name) => [
            `${new Intl.NumberFormat("vi-VN").format(v)} m³`,
            name === "actual" ? "Thực tế" : "Kế hoạch",
          ]}
        />
        <Legend
          verticalAlign="bottom"
          height={26}
          iconType="circle"
          iconSize={7}
          formatter={(v) => (
            <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
              {v === "actual" ? "Thực tế" : "Kế hoạch"}
            </span>
          )}
        />
        <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" opacity={0.35} radius={[3, 3, 0, 0]} maxBarSize={34} />
        <Bar dataKey="actual" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VehicleStatusChart({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((a, d) => a + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-[230px] items-center justify-center text-[13px] text-muted-foreground">
        Chưa có phương tiện
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie
          data={data.filter((d) => d.value > 0)}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data
            .filter((d) => d.value > 0)
            .map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
        </Pie>
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v: number, name) => [`${v} xe`, name]}
        />
        <Legend
          verticalAlign="bottom"
          height={44}
          iconType="circle"
          iconSize={7}
          formatter={(v) => (
            <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{v}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

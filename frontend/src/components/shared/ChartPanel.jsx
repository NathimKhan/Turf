import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "../ui/card.jsx";

const chartColors = ["#2563EB", "#06B6D4", "#22C55E", "#F59E0B"];

export function ChartPanel({ title, subtitle, data, type = "area", dataKey = "revenue" }) {
  return (
    <Card className="min-h-[320px]">
      <CardContent>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-ink">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            {type === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey={dataKey} fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : type === "line" ? (
              <LineChart data={data}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Line dataKey={dataKey} dot={{ r: 4 }} stroke="#2563EB" strokeWidth={3} type="monotone" />
                <Line dataKey="previous" stroke="#94A3B8" strokeDasharray="5 5" strokeWidth={2} type="monotone" />
              </LineChart>
            ) : type === "pie" ? (
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={58} outerRadius={90} paddingAngle={4}>
                  {data.map((entry, index) => (
                    <Cell fill={chartColors[index % chartColors.length]} key={entry.name} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Area dataKey={dataKey} fill="url(#revenueFill)" stroke="#2563EB" strokeWidth={3} type="monotone" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

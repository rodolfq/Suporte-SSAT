'use client';

import React, { useEffect, useState } from 'react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import ChartContainer from './chart-container';

interface Props {
  data?: any[];
}

export default function DashboardChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[320px] flex items-center justify-center text-gray-400">
        Carregando gráfico...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[320px] flex items-center justify-center text-gray-400">
        Sem dados para exibir
      </div>
    );
  }

  return (
    <ChartContainer height={320}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
          />

          <YAxis
            tick={{ fontSize: 12 }}
          />

          <Tooltip />

          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
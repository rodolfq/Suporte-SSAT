'use client';

import React from 'react';

interface ChartContainerProps {
  children: React.ReactNode;
  height?: number;
}

export default function ChartContainer({
  children,
  height = 320,
}: ChartContainerProps) {
  return (
    <div
      className="chart-container"
      style={{
        width: '100%',
        height: `${height}px`,
        minHeight: `${height}px`,
        minWidth: 0,
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}
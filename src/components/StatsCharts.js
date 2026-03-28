import React, { useMemo } from 'react';
import '../styles/StatsCharts.css';

export function PieChart({ data, title, colors = {} }) {
  const total = useMemo(() => Object.values(data).reduce((a, b) => a + b, 0), [data]);
  
  if (total === 0) {
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="chart-empty">No data available</div>
      </div>
    );
  }

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  let currentAngle = 0;
  const slices = entries.map(([label, value]) => {
    const percentage = (value / total) * 100;
    const sliceAngle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
    const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
    const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
    const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    const color = colors[label] || `hsl(${(Object.keys(data).indexOf(label) * 360) / Object.keys(data).length}, 70%, 60%)`;

    return {
      label,
      value,
      percentage: percentage.toFixed(1),
      pathData,
      color,
      startAngle
    };
  });

  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <div className="pie-chart-wrapper">
        <svg viewBox="0 0 100 100" className="pie-chart">
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={slice.pathData}
              fill={slice.color}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.5"
            />
          ))}
        </svg>
        <div className="pie-legend">
          {slices.map((slice, idx) => (
            <div key={idx} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: slice.color }}></div>
              <div className="legend-text">
                <span className="legend-label">{slice.label}</span>
                <span className="legend-value">{slice.value} ({slice.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BarChart({ data, title, colors = {} }) {
  const entries = useMemo(() => Object.entries(data).sort((a, b) => b[1] - a[1]), [data]);
  const maxValue = useMemo(() => Math.max(...entries.map(e => e[1]), 1), [entries]);

  if (entries.length === 0) {
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="chart-empty">No data available</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <div className="bar-chart">
        {entries.map(([label, value], idx) => {
          const percentage = (value / maxValue) * 100;
          const color = colors[label] || `hsl(${(idx * 360) / entries.length}, 70%, 60%)`;

          return (
            <div key={idx} className="bar-item">
              <div className="bar-label">{label}</div>
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                >
                  <span className="bar-value">{value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, label, color = '#ff6b35' }) {
  const percentage = (value / max) * 100;

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{value} / {max}</span>
      </div>
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        ></div>
      </div>
      <div className="progress-percentage">{percentage.toFixed(1)}%</div>
    </div>
  );
}

export function StatCard({ icon, title, value, subtitle, color = '#ff6b35' }) {
  return (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-content">
        <h4 className="stat-title">{title}</h4>
        <div className="stat-value">{value}</div>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

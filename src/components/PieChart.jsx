import React, { useState, useEffect, useRef } from 'react';

const PieChart = ({ data, size: providedSize }) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState(providedSize || 200);

  // 響應式調整 size
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      const containerWidth = containerRef.current.offsetWidth;
      const windowWidth = window.innerWidth;

      // 根據螢幕寬度設置不同的最大尺寸
      let maxSize;
      if (windowWidth <= 480) {
        // 小手機：最大 150px
        maxSize = Math.min(containerWidth - 20, 150);
      } else if (windowWidth <= 768) {
        // 平板/大手機：最大 170px
        maxSize = Math.min(containerWidth - 40, 170);
      } else {
        // 桌面：200px
        maxSize = 200;
      }

      setSize(providedSize || maxSize);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [providedSize]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div ref={containerRef} className="pie-chart-container" style={{ width: '100%', maxWidth: size }}>
        <div className="empty-chart">
          <span>No data yet</span>
        </div>
      </div>
    );
  }

  // Calculate angles
  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    currentAngle += angle;

    // 計算 SVG 路徑
    const radius = size / 2 - 10;
    const centerX = size / 2;
    const centerY = size / 2;
    
    const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      ...item,
      pathData,
      percentage: percentage.toFixed(1),
      color: getColor(index)
    };
  });

  return (
    <div ref={containerRef} className="pie-chart-container" style={{ width: '100%' }}>
      <div className="chart-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="pie-chart"
          style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
        >
          {segments.length === 1 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 10}
              fill={segments[0].color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          ) : (
            segments.map((segment, index) => (
              <path
                key={index}
                d={segment.pathData}
                fill={segment.color}
                stroke="#ffffff"
                strokeWidth="2"
                className="chart-segment"
              />
            ))
          )}
        </svg>
        
        <div className="chart-legend">
          {segments.map((segment, index) => (
            <div key={index} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: segment.color }}
              ></div>
              <span className="legend-label">{segment.label}</span>
              <span className="legend-value">
                ${segment.value} ({segment.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Simple color generation function - Artist Patronage warm palette with better contrast
const getColor = (index) => {
  const colors = [
    '#B8860B', // Dark goldenrod - Merchandise
    '#FF7F50', // Coral - Concert
    '#A0522D', // Sienna - Support Event
    '#FFB347', // Pastel orange - Other
    '#C1440E', // Rust - Additional
    '#9B870C', // Dark olive - Additional
    '#E87722', // Carrot orange - Additional
    '#8B4513'  // Saddle brown - Additional
  ];
  return colors[index % colors.length];
};

export default PieChart;

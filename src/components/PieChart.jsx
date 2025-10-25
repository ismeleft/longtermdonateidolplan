import React from 'react';

const PieChart = ({ data, size = 200 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="pie-chart-container" style={{ width: size, height: size }}>
        <div className="empty-chart">
          <span>尚無數據</span>
        </div>
      </div>
    );
  }

  // 計算角度
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
    <div className="pie-chart-container">
      <div className="chart-wrapper">
        <svg width={size} height={size} className="pie-chart">
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

// 簡單的顏色生成函數
const getColor = (index) => {
  const colors = [
    '#6366f1', // 藍紫色 - 周邊
    '#10b981', // 綠色 - 演唱會
    '#f59e0b', // 橙色 - 應援
    '#ef4444', // 紅色 - 其他
    '#8b5cf6', // 紫色
    '#06b6d4', // 青色
    '#84cc16', // 萊姆綠
    '#f97316'  // 橙紅色
  ];
  return colors[index % colors.length];
};

export default PieChart;

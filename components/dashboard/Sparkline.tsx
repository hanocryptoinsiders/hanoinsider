import { useId } from "react";

interface SparklineProps {
  points?: number[];
  stroke?: string;
  fill?: string;
  height?: number;
  className?: string;
}

export function Sparkline({
  points,
  stroke,
  fill,
  height = 60,
  className,
}: SparklineProps) {
  const gradientId = useId();
  
  // Default fallback data if empty or loading
  const data = points && points.length > 1 ? points : [40, 38, 42, 39, 45, 41, 48, 46, 52, 50, 55];
  
  const w = 300; // Increased width for smoother curves
  const h = height;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  
  // Map points to SVG coordinates
  // Leave 6px padding at top and bottom so lines don't get clipped
  const padding = 6;
  const coords = data.map((p, i) => ({
    x: i * step,
    y: h - ((p - min) / range) * (h - padding * 2) - padding,
  }));
  
  // Determine trend color if not explicitly overridden
  const isUp = data[data.length - 1] >= data[0];
  const trendColor = isUp ? "oklch(0.78 0.18 150)" : "oklch(0.62 0.22 25)";
  const strokeColor = stroke || trendColor;
  
  // Generate Bezier smoothed path
  let path = "";
  if (coords.length > 0) {
    path = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 3;
      const cp1y = curr.y;
      const cp2x = curr.x + 2 * (next.x - curr.x) / 3;
      const cp2y = next.y;
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }
  }
  
  const area = `${path} L ${w},${h} L 0,${h} Z`;
  const lastPoint = coords[coords.length - 1];

  return (
    <svg 
      viewBox={`0 0 ${w} ${h}`} 
      preserveAspectRatio="none" 
      className={className} 
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.24} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      
      {/* Area Gradient Fill */}
      {path && <path d={area} fill={`url(#${gradientId})`} />}
      
      {/* Main Sparkline Path */}
      {path && (
        <path 
          d={path} 
          fill="none" 
          stroke={strokeColor} 
          strokeWidth={1.75} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      )}
      
      {/* Glowing End Dot */}
      {lastPoint && (
        <>
          {/* Pulsing ring */}
          <circle 
            cx={lastPoint.x} 
            cy={lastPoint.y} 
            r={4} 
            fill={strokeColor} 
            className="animate-ping" 
            style={{ transformOrigin: `${lastPoint.x}px ${lastPoint.y}px` }} 
            opacity={0.7}
          />
          {/* Solid inner dot */}
          <circle 
            cx={lastPoint.x} 
            cy={lastPoint.y} 
            r={2.5} 
            fill={strokeColor} 
            stroke="oklch(0.08 0 0)" 
            strokeWidth={0.75} 
          />
        </>
      )}
    </svg>
  );
}

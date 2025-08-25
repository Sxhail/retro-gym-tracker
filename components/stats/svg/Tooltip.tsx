import React from 'react';
import { G, Rect, Text as SvgText } from 'react-native-svg';
import theme from '../../../styles/theme';

type Props = {
  x: number;
  y: number;
  lines: string[];
  chartWidth?: number;
};

// Lightweight in-SVG tooltip with auto clamping and neon styling
export default function Tooltip({ x, y, lines, chartWidth = 360 }: Props) {
  const paddingX = 8;
  const paddingY = 6;
  const lineHeight = 14;
  const textWidth = Math.max(80, Math.max(...lines.map(l => l.length || 0)) * 6.5);
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = lines.length * lineHeight + paddingY * 2;

  const px = x > chartWidth / 2 ? x - boxWidth - 8 : x + 8; // place left or right of point
  const py = Math.max(4, y - boxHeight - 8); // above point with clamp

  return (
    <G>
      <Rect
        x={px}
        y={py}
        rx={6}
        ry={6}
        width={boxWidth}
        height={boxHeight}
        fill={theme.colors.backgroundOverlay}
        opacity={0.95}
        stroke={theme.colors.neon}
        strokeOpacity={0.6}
      />
      {lines.map((line, i) => (
        <SvgText
          key={i}
          x={px + paddingX}
          y={py + paddingY + (i + 1) * lineHeight - 4}
          fill={theme.colors.neon}
          fontSize={11}
        >
          {line}
        </SvgText>
      ))}
    </G>
  );
}

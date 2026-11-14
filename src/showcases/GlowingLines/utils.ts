import { Skia, type SkPath } from "@shopify/react-native-skia";

import { GlowingLines as C } from "./constants";

export const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.max(min, Math.min(max, value));
};

export const getPoint = (positions: number[], line: number, index: number) => {
  "worklet";
  return positions[line * C.POINT_COUNT + index];
};

export const getStringOffset = (
  positions: number[],
  line: number,
  x: number,
  width: number,
) => {
  "worklet";

  const position = clamp(x / width, 0, 1) * (C.POINT_COUNT - 1);
  const left = Math.floor(position);
  const right = Math.min(C.POINT_COUNT - 1, left + 1);
  const progress = position - left;

  return (
    getPoint(positions, line, left) * (1 - progress) +
    getPoint(positions, line, right) * progress
  );
};

export const createStringPath = (
  positions: number[],
  line: number,
  width: number,
  centerY: number,
): SkPath => {
  "worklet";

  const path = Skia.PathBuilder.Make();
  const baseY = centerY + (line - 1) * C.LINE_SPACING;
  const stepX = width / (C.POINT_COUNT - 1);

  path.moveTo(0, baseY + getPoint(positions, line, 0));

  for (let i = 0; i < C.POINT_COUNT - 1; i++) {
    const y0 = baseY + getPoint(positions, line, Math.max(0, i - 1));
    const y1 = baseY + getPoint(positions, line, i);
    const y2 = baseY + getPoint(positions, line, i + 1);
    const y3 =
      baseY + getPoint(positions, line, Math.min(C.POINT_COUNT - 1, i + 2));
    const x1 = i * stepX;
    const x2 = (i + 1) * stepX;

    path.cubicTo(
      x1 + stepX / 3,
      y1 + (y2 - y0) / 6,
      x2 - stepX / 3,
      y2 - (y3 - y1) / 6,
      x2,
      y2,
    );
  }

  return path.build();
};

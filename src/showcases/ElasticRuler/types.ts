import type { SharedValue } from "react-native-reanimated";

export type RulerTick = {
  value: number;
  y: number;
};

export type RulerTicksProps = {
  isMajor: boolean;
  lineX: number;
  centerY: number;
  height: number;
  tickSpacing: number;
  circleX: SharedValue<number>;
  circleY: SharedValue<number>;
  rulerValue: SharedValue<number>;
};

export type RulerNumberProps = {
  tick: RulerTick;
  lineX: number;
  height: number;
  tickSpacing: number;
  circleX: SharedValue<number>;
  circleY: SharedValue<number>;
  rulerValue: SharedValue<number>;
};

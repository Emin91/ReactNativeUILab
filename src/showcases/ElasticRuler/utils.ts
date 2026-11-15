import { ElasticRuler as C } from "./constants";

export const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.max(min, Math.min(max, value));
};

export const getBend = (circleX: number, lineX: number) => {
  "worklet";
  const gap = circleX - C.CIRCLE_RADIUS - lineX;
  return clamp(C.INFLUENCE_DISTANCE - gap, 0, C.MAX_BEND);
};

export const getBendInfluence = (y: number, circleY: number) => {
  "worklet";
  const distance = Math.abs(y - circleY);
  const progress = clamp(1 - distance / C.BEND_HALF_HEIGHT, 0, 1);
  return progress * progress * (3 - 2 * progress);
};

export const getCloseness = (bend: number) => {
  "worklet";
  const maxReachableBend = Math.min(
    C.MAX_BEND,
    C.INFLUENCE_DISTANCE + C.CIRCLE_OVERLAP,
  );
  return clamp(bend / maxReachableBend, 0, 1);
};

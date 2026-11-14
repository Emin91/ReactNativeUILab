import type { ComponentType } from "react";

import GlowingLines from "../showcases/GlowingLines";
import GradientLetter from "../showcases/GradientLetter";

export type TShowcase = {
  id: string;
  title: string;
  component: ComponentType;
};

export const showcases: TShowcase[] = [
  {
    id: "glowing-lines",
    title: "Glowing Lines",
    component: GlowingLines,
  },
  {
    id: "gradient-letter",
    title: "Gradient Letter",
    component: GradientLetter,
  },
];

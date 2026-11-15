
import React from "react";

import Animated, { interpolateColor, useAnimatedStyle } from "react-native-reanimated";

import { ElasticRuler as C } from "../constants";
import type { RulerNumberProps } from "../types";
import { clamp, getBend, getBendInfluence, getCloseness } from "../utils";

export function RulerNumber({
	tick,
	lineX,
	height,
	tickSpacing,
	circleX,
	circleY,
	rulerValue,
}: RulerNumberProps) {
	const animatedStyle = useAnimatedStyle(() => {
		const currentY = tick.y + rulerValue.value * tickSpacing;
		const bend = getBend(circleX.value, lineX);
		const influence = getBendInfluence(currentY, circleY.value);
		const displacement = bend * influence;

		const proximity = Math.exp(
			-Math.pow((currentY - circleY.value) / C.NUMBER_FOCUS_RADIUS, 2)
		);

		const intensity = proximity * getCloseness(bend);
		const scale = 1 + (C.NUMBER_MAX_SCALE - 1) * intensity;
		const glow = clamp(intensity * C.NUMBER_GLOW_INTENSITY, 0, 1);

		const isVisible =
			currentY >= -C.RULER_RENDER_MARGIN &&
			currentY <= height + C.RULER_RENDER_MARGIN;

		return {
			opacity: isVisible ? 1 : 0,
			color: interpolateColor(
				glow,
				[0, 1],
				["#777777", C.NUMBER_GLOW_COLOR]
			),
			textShadowColor: interpolateColor(
				glow,
				[0, 1],
				["rgba(170,239,42,0)", "rgba(170,239,42,0.95)"]
			),
			textShadowRadius: C.NUMBER_GLOW_RADIUS * glow,
			transform: [
				{ translateX: -displacement },
				{ translateY: rulerValue.value * tickSpacing },
				{ scale },
			],
		};
	});

	return (
		<Animated.Text
			style={[
				{
					position: "absolute",
					top: tick.y - 13,
					right: 0,
					fontSize: 20,
					fontWeight: "300",
					fontVariant: ["tabular-nums"],
					textShadowOffset: { width: 0, height: 0 },
				},
				animatedStyle,
			]}
		>
			{tick.value}
		</Animated.Text>
	);
}

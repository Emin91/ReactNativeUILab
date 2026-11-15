
import { BlurMask, LinearGradient, Path, usePathValue } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { ElasticRuler as C } from "../constants";
import type { RulerTicksProps } from "../types";
import { clamp, getBend, getBendInfluence, getCloseness } from "../utils";

export function RulerTicks({
	isMajor,
	lineX,
	centerY,
	height,
	tickSpacing,
	circleX,
	circleY,
	rulerValue,
}: RulerTicksProps) {
	const ticksPath = usePathValue((path) => {
		"worklet";

		const bend = getBend(circleX.value, lineX);
		const originY = centerY + rulerValue.value * tickSpacing;

		const firstValue = Math.max(
			C.RULER_MIN_VALUE,
			Math.ceil((originY - height - C.RULER_RENDER_MARGIN) / tickSpacing)
		);

		const lastValue = Math.min(
			C.RULER_MAX_VALUE,
			Math.floor((originY + C.RULER_RENDER_MARGIN) / tickSpacing)
		);

		for (let value = firstValue; value <= lastValue; value++) {
			const major = value % C.RULER_MAJOR_STEP === 0;
			if (major !== isMajor) continue;

			const y = originY - value * tickSpacing;
			const influence = getBendInfluence(y, circleY.value);
			const displacement = bend * influence;
			const intensity = clamp(displacement / C.MAX_BEND, 0, 1);
			const width = major ? C.RULER_MAJOR_WIDTH : C.RULER_MINOR_WIDTH;
			const tickWidth = width * (1 - intensity * C.TICK_SHRINK);
			const tickGap = C.RULER_TICK_GAP * (1 - intensity * C.TICK_GAP_SHRINK);
			const tickRightX = lineX - displacement - tickGap;

			path.moveTo(tickRightX - tickWidth, y);
			path.lineTo(tickRightX, y);
		}
	});

	const tickGlowStart = useDerivedValue(() => ({
		x: lineX,
		y: circleY.value - C.BEND_HALF_HEIGHT,
	}));

	const tickGlowEnd = useDerivedValue(() => ({
		x: lineX,
		y: circleY.value + C.BEND_HALF_HEIGHT,
	}));

	const tickGlowOpacity = useDerivedValue(() => {
		const bend = getBend(circleX.value, lineX);
		return Math.pow(getCloseness(bend), 1.4) * C.TICK_GLOW_INTENSITY;
	});

	return (
		<>
			<Path
				path={ticksPath}
				color={isMajor ? "#777777" : "#404040"}
				style="stroke"
				strokeWidth={isMajor ? 2.5 : 1.5}
				strokeCap="round"
			/>

			{/* Soft outer tick glow */}
			<Path
				path={ticksPath}
				style="stroke"
				strokeWidth={C.TICK_GLOW_WIDTH}
				strokeCap="round"
				opacity={tickGlowOpacity}
			>
				<LinearGradient
					start={tickGlowStart}
					end={tickGlowEnd}
					colors={[
						"rgba(170,239,42,0)",
						"rgba(170,239,42,0.10)",
						"rgba(170,239,42,0.72)",
						"rgba(170,239,42,0.10)",
						"rgba(170,239,42,0)",
					]}
					positions={[0, 0.25, 0.5, 0.75, 1]}
				/>
				<BlurMask blur={C.TICK_GLOW_BLUR} style="normal" />
			</Path>

			{/* Bright inner tick glow */}
			<Path
				path={ticksPath}
				style="stroke"
				strokeWidth={C.TICK_GLOW_INNER_WIDTH}
				strokeCap="round"
				opacity={tickGlowOpacity}
			>
				<LinearGradient
					start={tickGlowStart}
					end={tickGlowEnd}
					colors={[
						"rgba(170,239,42,0)",
						"rgba(170,239,42,0.16)",
						"rgba(170,239,42,0.95)",
						"rgba(170,239,42,0.16)",
						"rgba(170,239,42,0)",
					]}
					positions={[0, 0.25, 0.5, 0.75, 1]}
				/>
				<BlurMask blur={C.TICK_GLOW_INNER_BLUR} style="normal" />
			</Path>

			{/* Highlight the tick itself near the bend */}
			<Path
				path={ticksPath}
				style="stroke"
				strokeWidth={isMajor ? 2.5 : 1.5}
				strokeCap="round"
				opacity={tickGlowOpacity}
			>
				<LinearGradient
					start={tickGlowStart}
					end={tickGlowEnd}
					colors={[
						"rgba(170,239,42,0)",
						"rgba(170,239,42,0.10)",
						"rgba(170,239,42,1)",
						"rgba(170,239,42,0.10)",
						"rgba(170,239,42,0)",
					]}
					positions={[0, 0.25, 0.5, 0.75, 1]}
				/>
			</Path>
		</>
	);
}

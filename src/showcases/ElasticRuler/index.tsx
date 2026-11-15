
import { useMemo } from "react";

import { StyleSheet, TextInput, useWindowDimensions, View } from "react-native";

import {
	BlurMask,
	Canvas,
	Circle,
	Fill,
	LinearGradient,
	Path,
	Shader,
	usePathValue,
	vec,
} from "@shopify/react-native-skia";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
	cancelAnimation,
	useAnimatedProps,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

import { RulerNumber } from "./components/RulerNumber";
import { RulerTicks } from "./components/RulerTicks";
import { ElasticRuler as C } from "./constants";
import { DIRECTIONAL_GLOW_EFFECT } from "./shaders";
import type { RulerTick } from "./types";
import { clamp, getBend, getCloseness } from "./utils";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function ElasticRuler() {
	const { width, height } = useWindowDimensions();

	const lineX = width * C.RULER_POSITION_X;
	const centerY = height / 2;
	const tickSpacing = Math.max(
		1,
		(height - C.RULER_PADDING * 2) / C.RULER_VISIBLE_RANGE
	);

	const minX = lineX + C.CIRCLE_RADIUS - C.CIRCLE_OVERLAP;
	const maxX = Math.max(minX, width - C.CIRCLE_RADIUS - 12);
	const minY = centerY - C.MAX_VERTICAL_OFFSET;
	const maxY = centerY + C.MAX_VERTICAL_OFFSET;

	const circleX = useSharedValue(maxX);
	const circleY = useSharedValue(centerY);
	const rulerValue = useSharedValue(C.RULER_INITIAL_VALUE);
	const pullDistanceY = useSharedValue(0);
	const gestureAxis = useSharedValue<0 | 1 | 2>(0);
	const gestureX = useSharedValue(0);
	const gestureY = useSharedValue(0);

	const majorTicks = useMemo(() => {
		const ticks: RulerTick[] = [];

		for (
			let value = C.RULER_MIN_VALUE;
			value <= C.RULER_MAX_VALUE;
			value += C.RULER_MAJOR_STEP
		) {
			ticks.push({
				value,
				y: centerY - value * tickSpacing,
			});
		}

		return ticks;
	}, [centerY, tickSpacing]);

	const glowOpacity = useDerivedValue(() => {
		const bend = getBend(circleX.value, lineX);
		return Math.pow(getCloseness(bend), C.GLOW_RESPONSE) * C.GLOW_INTENSITY;
	});

	const glowStart = useDerivedValue(() => ({
		x: lineX,
		y: circleY.value - C.BEND_HALF_HEIGHT,
	}));

	const glowEnd = useDerivedValue(() => ({
		x: lineX,
		y: circleY.value + C.BEND_HALF_HEIGHT,
	}));

	const directionalGlowUniforms = useDerivedValue(() => ({
		lineX,
		bend: getBend(circleX.value, lineX),
		centerY: circleY.value,
		halfHeight: C.BEND_HALF_HEIGHT,
		glowWidth: C.SIDE_GLOW_WIDTH,
		intensity: glowOpacity.value * C.SIDE_GLOW_INTENSITY * C.SIDE_GLOW_OPACITY,
	}));

	const circleGlowOpacity = useDerivedValue(() => {
		const bend = getBend(circleX.value, lineX);

		return (
			Math.pow(getCloseness(bend), C.CIRCLE_GLOW_RESPONSE) *
			C.CIRCLE_GLOW_INTENSITY
		);
	});

	const circleGlowStart = useDerivedValue(() => ({
		x: circleX.value - C.CIRCLE_RADIUS,
		y: circleY.value,
	}));

	const circleGlowEnd = useDerivedValue(() => ({
		x: circleX.value + C.CIRCLE_RADIUS,
		y: circleY.value,
	}));

	const panGesture = usePanGesture({
		minDistance: 1,
		onActivate: () => {
			cancelAnimation(circleY);
			pullDistanceY.value = 0;
			gestureAxis.value = 0;
			gestureX.value = 0;
			gestureY.value = 0;
		},
		onUpdate: (event) => {
			gestureX.value += event.changeX;
			gestureY.value += event.changeY;

			if (gestureAxis.value === 0) {
				const absX = Math.abs(gestureX.value);
				const absY = Math.abs(gestureY.value);

				if (
					absX >= C.GESTURE_DIRECTION_THRESHOLD &&
					absX > absY * C.GESTURE_DIRECTION_RATIO
				) {
					gestureAxis.value = 1;
				} else if (
					absY >= C.GESTURE_DIRECTION_THRESHOLD &&
					absY > absX * C.GESTURE_DIRECTION_RATIO
				) {
					gestureAxis.value = 2;
				}
			}

			// Horizontal movement only
			if (gestureAxis.value === 1) {
				circleX.value = clamp(circleX.value + event.changeX, minX, maxX);
				return;
			}

			if (gestureAxis.value !== 2) return;

			// Vertical movement
			pullDistanceY.value += event.changeY;
			const offsetY = circleY.value - centerY;
			const progress = clamp(
				Math.abs(offsetY) / C.MAX_VERTICAL_OFFSET,
				0,
				1
			);
			const isPullingAway = offsetY * event.changeY > 0;
			const resistance = isPullingAway
				? Math.pow(1 - progress, C.SPRING_RESISTANCE)
				: 1;

			circleY.value = clamp(
				circleY.value + event.changeY * resistance,
				minY,
				maxY
			);

			// Ruler scrolling continues after the circle reaches its Y limit.
			const pullProgress = clamp(
				Math.abs(pullDistanceY.value) / C.MAX_VERTICAL_OFFSET,
				0,
				C.RULER_MAX_ACCELERATION
			);

			const scrollSpeed =
				C.RULER_SCROLL_MULTIPLIER *
				(1 + pullProgress * C.RULER_SCROLL_ACCELERATION);

			const valueDelta = -event.changeY * scrollSpeed / tickSpacing;

			rulerValue.value = clamp(
				rulerValue.value + valueDelta,
				C.RULER_MIN_VALUE,
				C.RULER_MAX_VALUE
			);
		},
		onDeactivate: () => {
			circleY.value = withSpring(centerY, {
				stiffness: C.SPRING_STIFFNESS,
				damping: C.SPRING_DAMPING,
				mass: C.SPRING_MASS,
				overshootClamping: false,
			});
		},
	});

	const linePath = usePathValue((path) => {
		"worklet";

		const bend = getBend(circleX.value, lineX);
		const bendX = lineX - bend;
		const currentY = circleY.value;
		const topY = currentY - C.BEND_HALF_HEIGHT;
		const bottomY = currentY + C.BEND_HALF_HEIGHT;

		path.moveTo(lineX, 0);
		path.lineTo(lineX, topY);
		path.cubicTo(
			lineX,
			topY + C.BEND_HALF_HEIGHT / 3,
			bendX,
			currentY - C.BEND_HALF_HEIGHT / 3,
			bendX,
			currentY
		);
		path.cubicTo(
			bendX,
			currentY + C.BEND_HALF_HEIGHT / 3,
			lineX,
			bottomY - C.BEND_HALF_HEIGHT / 3,
			lineX,
			bottomY
		);
		path.lineTo(lineX, height);
	});

	const circleStyle = useAnimatedStyle(() => ({
		position: "absolute",
		left: -C.CIRCLE_RADIUS,
		top: -C.CIRCLE_RADIUS,
		width: C.CIRCLE_RADIUS * 2,
		height: C.CIRCLE_RADIUS * 2,
		borderRadius: C.CIRCLE_RADIUS,
		justifyContent: "center",
		alignItems: "center",
		transform: [
			{ translateX: circleX.value },
			{ translateY: circleY.value },
		],
	}));

	const selectedValueProps = useAnimatedProps(() => {
		const value = String(Math.round(rulerValue.value));

		return {
			text: value,
			defaultValue: value,
		};
	});

	return (
		<View style={styles.container}>
			<Canvas style={styles.canvas}>
				<RulerTicks
					isMajor={false}
					lineX={lineX}
					centerY={centerY}
					height={height}
					tickSpacing={tickSpacing}
					circleX={circleX}
					circleY={circleY}
					rulerValue={rulerValue}
				/>

				<RulerTicks
					isMajor
					lineX={lineX}
					centerY={centerY}
					height={height}
					tickSpacing={tickSpacing}
					circleX={circleX}
					circleY={circleY}
					rulerValue={rulerValue}
				/>

				{/* Soft outer glow */}
				<Path
					path={linePath}
					style="stroke"
					strokeWidth={C.GLOW_WIDTH}
					strokeCap="round"
					opacity={glowOpacity}
				>
					<LinearGradient
						start={glowStart}
						end={glowEnd}
						colors={[
							"rgba(170,239,42,0)",
							"rgba(170,239,42,0.12)",
							"rgba(170,239,42,0.5)",
							"rgba(170,239,42,0.12)",
							"rgba(170,239,42,0)",
						]}
						positions={[0, 0.25, 0.5, 0.75, 1]}
					/>
					<BlurMask blur={C.GLOW_BLUR} style="normal" />
				</Path>

				{/* Bright inner glow */}
				<Path
					path={linePath}
					style="stroke"
					strokeWidth={C.GLOW_INNER_WIDTH}
					strokeCap="round"
					opacity={glowOpacity}
				>
					<LinearGradient
						start={glowStart}
						end={glowEnd}
						colors={[
							"rgba(170,239,42,0)",
							"rgba(170,239,42,0.2)",
							"rgba(170,239,42,0.8)",
							"rgba(170,239,42,0.2)",
							"rgba(170,239,42,0)",
						]}
						positions={[0, 0.25, 0.5, 0.75, 1]}
					/>
					<BlurMask blur={C.GLOW_INNER_BLUR} style="normal" />
				</Path>

				{/* Directional glow */}
				{DIRECTIONAL_GLOW_EFFECT && (
					<Fill>
						<Shader
							source={DIRECTIONAL_GLOW_EFFECT}
							uniforms={directionalGlowUniforms}
						/>
					</Fill>
				)}

				{/* Main gradient line */}
				<Path
					path={linePath}
					style="stroke"
					strokeWidth={2}
					strokeCap="round"
				>
					<LinearGradient
						start={vec(lineX, 0)}
						end={vec(lineX, height)}
						colors={[
							"rgba(170,239,42,0)",
							"rgba(170,239,42,0.5)",
							C.GLOW_COLOR,
							"rgba(170,239,42,0.5)",
							"rgba(170,239,42,0)",
						]}
						positions={[0, 0.25, 0.5, 0.75, 1]}
					/>
				</Path>

				{/* Circle background */}
				<Circle
					cx={circleX}
					cy={circleY}
					r={C.CIRCLE_RADIUS}
					color={C.CIRCLE_COLOR}
				/>

				{/* Soft circle glow */}
				<Circle
					cx={circleX}
					cy={circleY}
					r={C.CIRCLE_RADIUS + 4}
					opacity={circleGlowOpacity}
				>
					<LinearGradient
						start={circleGlowStart}
						end={circleGlowEnd}
						colors={[
							"rgba(170,239,42,0.55)",
							"rgba(170,239,42,0.25)",
							"rgba(170,239,42,0)",
						]}
						positions={[0, 0.35, 1]}
					/>
					<BlurMask blur={C.CIRCLE_GLOW_BLUR} style="normal" />
				</Circle>

				{/* Circle surface glow */}
				<Circle
					cx={circleX}
					cy={circleY}
					r={C.CIRCLE_RADIUS}
					opacity={circleGlowOpacity}
				>
					<LinearGradient
						start={circleGlowStart}
						end={circleGlowEnd}
						colors={[
							"rgba(170,239,42,0.65)",
							"rgba(170,239,42,0.30)",
							"rgba(170,239,42,0.08)",
							"rgba(170,239,42,0)",
						]}
						positions={[0, 0.3, 0.7, 1]}
					/>
				</Circle>

				{/* Circle border */}
				<Circle
					cx={circleX}
					cy={circleY}
					r={C.CIRCLE_RADIUS}
					color="#777777"
					style="stroke"
					strokeWidth={2}
				/>
			</Canvas>

			{/* Ruler numbers */}
			<View
				pointerEvents="none"
				style={[
					styles.numbersContainer,
					{ width: Math.max(0, lineX - 50) },
				]}
			>
				{majorTicks.map(tick => (
					<RulerNumber
						key={tick.value}
						tick={tick}
						lineX={lineX}
						height={height}
						tickSpacing={tickSpacing}
						circleX={circleX}
						circleY={circleY}
						rulerValue={rulerValue}
					/>
				))}
			</View>

			{/* Draggable circle with selected value */}
			<GestureDetector gesture={panGesture}>
				<Animated.View style={circleStyle}>
					<AnimatedTextInput
						animatedProps={selectedValueProps}
						defaultValue="0"
						editable={false}
						caretHidden
						pointerEvents="none"
						style={styles.selectedValue}
					/>
				</Animated.View>
			</GestureDetector>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: C.BACKGROUND,
	},
	canvas: {
		flex: 1,
	},
	numbersContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		bottom: 0,
	},
	selectedValue: {
		width: "100%",
		height: "100%",
		color: "#FFFFFF",
		fontSize: 34,
		fontWeight: "600",
		textAlign: "center",
		textAlignVertical: "center",
		fontVariant: ["tabular-nums"],
		includeFontPadding: false,
	},
});

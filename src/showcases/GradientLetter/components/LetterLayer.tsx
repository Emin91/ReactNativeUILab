
import React, { type FC } from "react";

import { StyleSheet } from "react-native";

import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";

import { GradientLetter as C } from "../constants";
import { mixWithWhite } from "../utils";

type TLetterLayerProps = {
	index: number;
	width: number;
	height: number;
	progress: SharedValue<number>;
};

export const LetterLayer: FC<TLetterLayerProps> = ({ index, width, height, progress }) => {
	const lightness = (index / Math.max(1, C.COPIES_COUNT)) * 0.5;
	const colors = C.COLORS.map(color => mixWithWhite(color, lightness));
	const gradientId = `gradient-${index}`;

	const animatedStyle = useAnimatedStyle(() => {
		const rotationFactor = Math.max(0.2, 1 - index * C.ROTATION_STEP);
		const rotation = -progress.value * C.MAX_ROTATION * rotationFactor;
		const translateX = progress.value * index * C.COPY_SPACING;

		return {
			transform: [
				{ perspective: C.PERSPECTIVE },
				{ translateX },
				{ rotateY: `${rotation}deg` },
			],
		};
	});

	return (
		<Animated.View
			pointerEvents="none"
			style={[
				styles.layer,
				{
					width,
					height,
					transformOrigin: "left center",
				},
				animatedStyle,
			]}
		>
			<Svg width={width} height={height} viewBox="0 0 400 500">
				<Defs>
					<LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						{colors.map((color, colorIndex) => (
							<Stop
								key={colorIndex}
								offset={`${(colorIndex / (colors.length - 1)) * 100}%`}
								stopColor={color}
							/>
						))}
					</LinearGradient>
				</Defs>

				<SvgText
					x="200"
					y="410"
					fontSize="485"
					fontWeight="900"
					textAnchor="middle"
					fill="none"
					stroke={C.OUTLINE_COLOR}
					strokeWidth={C.OUTLINE_WIDTH}
					strokeOpacity={C.OUTLINE_OPACITY}
					strokeLinejoin="round"
					strokeLinecap="round"
				>
					{C.LETTER}
				</SvgText>

				<SvgText
					x="200"
					y="410"
					fontSize="485"
					fontWeight="900"
					textAnchor="middle"
					fill={`url(#${gradientId})`}
					stroke="none"
				>
					{C.LETTER}
				</SvgText>
			</Svg>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	layer: {
		position: "absolute",
		left: 0,
		top: 0,
		backfaceVisibility: "hidden",
	},
});

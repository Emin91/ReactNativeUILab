
import React from "react";

import { StyleSheet, useWindowDimensions, View } from "react-native";

import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { cancelAnimation, useSharedValue, withSpring } from "react-native-reanimated";

import { LetterLayer } from "./components/LetterLayer";
import { GradientLetter as C } from "./constants";

// https://www.pinterest.com/pin/932878510327640387/

const layers = Array.from(
	{ length: C.COPIES_COUNT + 1 },
	(_, index) => C.COPIES_COUNT - index
);

export default function GradientLetter() {
	const { width, height } = useWindowDimensions();

	const progress = useSharedValue(0);
	const startProgress = useSharedValue(0);

	const totalSpacing = C.COPIES_COUNT * C.COPY_SPACING;
	const letterWidth = Math.min(width - totalSpacing - 32, 340);
	const letterHeight = Math.min(letterWidth * 1.3, height * 0.65);

	const gesture = usePanGesture({
		activeOffsetX: [-10, 10],
		failOffsetY: [-25, 25],
		onActivate: () => {
			cancelAnimation(progress);
			startProgress.value = progress.value;
		},
		onUpdate: (event) => {
			const distance = event.translationX / (letterWidth * 0.85);
			progress.value = Math.max(0, Math.min(1, startProgress.value - distance));
		},
		onDeactivate: (event) => {
			const predicted = progress.value - event.velocityX / 2500;
			const destination = predicted > 0.5 ? 1 : 0;

			progress.value = withSpring(destination, {
				stiffness: 180,
				damping: 23,
				mass: 1,
				overshootClamping: true,
			});
		},
	});

	return (
		<View style={styles.container}>
			<GestureDetector gesture={gesture}>
				<View
					style={{
						width: letterWidth + totalSpacing,
						height: letterHeight,
						justifyContent: "center",
					}}
				>
					<View style={{ width: letterWidth, height: letterHeight }}>
						{layers.map(index => (
							<LetterLayer
								key={index}
								index={index}
								width={letterWidth}
								height={letterHeight}
								progress={progress}
							/>
						))}
					</View>
				</View>
			</GestureDetector>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: C.BACKGROUND,
		alignItems: "center",
		justifyContent: "center",
	},
});

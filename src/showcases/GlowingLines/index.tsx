
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { Canvas } from "@shopify/react-native-skia";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import {
	interpolateColor,
	useDerivedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";

import { GlowingString } from "./components/GlowingString";
import { GlowingLines as C } from "./constants";
import { clamp, createStringPath, getPoint, getStringOffset } from "./utils";

export default function GlowingLines() {
	const { width } = useWindowDimensions();
	const centerY = C.CANVAS_HEIGHT / 2;

	const positions = useSharedValue<number[]>(Array(C.TOTAL_POINTS).fill(0));
	const velocities = useSharedValue<number[]>(Array(C.TOTAL_POINTS).fill(0));
	const activeLine = useSharedValue(-1);
	const activePoint = useSharedValue(-1);
	const dragTarget = useSharedValue(0);
	const startPullY = useSharedValue(0);
	const isRunning = useSharedValue(false);

	const bluePath = useDerivedValue(() =>
		createStringPath(positions.value, 0, width, centerY)
	);

	const redPath = useDerivedValue(() =>
		createStringPath(positions.value, 1, width, centerY)
	);

	const greenPath = useDerivedValue(() =>
		createStringPath(positions.value, 2, width, centerY)
	);

	const blueColor = useDerivedValue(() => {
		let maxPull = 0;
		for (let i = 0; i < C.POINT_COUNT; i++) {
			maxPull = Math.max(maxPull, Math.abs(positions.value[i]));
		}

		return interpolateColor(
			clamp(maxPull / C.MAX_PULL, 0, 1),
			[0, 1],
			[C.BLUE_COLOR, C.WHITE_COLOR]
		);
	});

	const redColor = useDerivedValue(() => {
		let maxPull = 0;
		for (let i = C.POINT_COUNT; i < C.POINT_COUNT * 2; i++) {
			maxPull = Math.max(maxPull, Math.abs(positions.value[i]));
		}

		return interpolateColor(
			clamp(maxPull / C.MAX_PULL, 0, 1),
			[0, 1],
			[C.RED_COLOR, C.WHITE_COLOR]
		);
	});

	const greenColor = useDerivedValue(() => {
		let maxPull = 0;
		for (let i = C.POINT_COUNT * 2; i < C.TOTAL_POINTS; i++) {
			maxPull = Math.max(maxPull, Math.abs(positions.value[i]));
		}

		return interpolateColor(
			clamp(maxPull / C.MAX_PULL, 0, 1),
			[0, 1],
			[C.GREEN_COLOR, C.WHITE_COLOR]
		);
	});


	const gesture = usePanGesture({
		minDistance: 0,
		onBegin: (event) => {
			let closestLine = -1;
			let closestDistance = C.TOUCH_RADIUS;

			for (let line = 0; line < C.LINE_COUNT; line++) {
				const baseY = centerY + (line - 1) * C.LINE_SPACING;
				const offset = getStringOffset(positions.value, line, event.x, width);
				const distance = Math.abs(event.y - baseY - offset);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestLine = line;
				}
			}

			if (closestLine === -1) return;

			const point = Math.round(clamp(
				event.x / width * (C.POINT_COUNT - 1),
				2,
				C.POINT_COUNT - 3
			));

			activeLine.value = closestLine;
			activePoint.value = point;
			startPullY.value = getPoint(positions.value, closestLine, point);
			dragTarget.value = startPullY.value;
			isRunning.value = true;
		},
		onUpdate: (event) => {
			if (activeLine.value === -1) return;

			activePoint.value = Math.round(clamp(
				event.x / width * (C.POINT_COUNT - 1),
				2,
				C.POINT_COUNT - 3
			));

			dragTarget.value = clamp(
				startPullY.value + event.translationY,
				-C.MAX_PULL,
				C.MAX_PULL
			);
		},
		onDeactivate: (event) => {
			if (activeLine.value === -1) return;

			const index = activeLine.value * C.POINT_COUNT + activePoint.value;
			const next = [...velocities.value];
			const velocity = clamp(event.velocityY * 0.45, -1500, 1500);

			next[index] = velocity;

			if (index > activeLine.value * C.POINT_COUNT + 1) {
				next[index - 1] += velocity * 0.4;
			}

			if (index < (activeLine.value + 1) * C.POINT_COUNT - 2) {
				next[index + 1] += velocity * 0.4;
			}

			velocities.value = next;
			activeLine.value = -1;
			activePoint.value = -1;
		},
		onFinalize: () => {
			activeLine.value = -1;
			activePoint.value = -1;
		},
	});

	useFrameCallback((frame) => {
		"worklet";

		if (!isRunning.value) return;

		const frameDt = clamp((frame.timeSincePreviousFrame ?? 16) / 1000, 0.001, 0.024);
		const dt = frameDt / C.PHYSICS_SUBSTEPS;

		let currentPositions = positions.value;
		let currentVelocities = velocities.value;

		const lockedIndex = activeLine.value === -1
			? -1
			: activeLine.value * C.POINT_COUNT + activePoint.value;

		for (let step = 0; step < C.PHYSICS_SUBSTEPS; step++) {
			const next = [...currentPositions];
			const nextVelocity = [...currentVelocities];

			for (let line = 0; line < C.LINE_COUNT; line++) {
				const start = line * C.POINT_COUNT;

				for (let i = 1; i < C.POINT_COUNT - 1; i++) {
					const index = start + i;
					if (index === lockedIndex) continue;

					const current = currentPositions[index];
					const left = currentPositions[index - 1];
					const right = currentPositions[index + 1];
					const velocity = currentVelocities[index];

					const acceleration =
						C.WAVE_STIFFNESS * (left + right - 2 * current)
						- C.REST_STIFFNESS * current
						- C.DAMPING * velocity;

					nextVelocity[index] = velocity + acceleration * dt;
					next[index] = current + nextVelocity[index] * dt;
				}

				next[start] = 0;
				next[start + C.POINT_COUNT - 1] = 0;
				nextVelocity[start] = 0;
				nextVelocity[start + C.POINT_COUNT - 1] = 0;
			}

			if (lockedIndex >= 0) {
				nextVelocity[lockedIndex] = clamp(
					(dragTarget.value - currentPositions[lockedIndex]) / dt,
					-1800,
					1800
				);

				next[lockedIndex] = dragTarget.value;
			}

			for (let iteration = 0; iteration < C.COLLISION_ITERATIONS; iteration++) {
				for (let line = 0; line < C.LINE_COUNT - 1; line++) {
					for (let i = 1; i < C.POINT_COUNT - 1; i++) {
						const a = line * C.POINT_COUNT + i;
						const b = (line + 1) * C.POINT_COUNT + i;
						const penetration = next[a] - next[b] - (C.LINE_SPACING - C.COLLISION_GAP);

						if (penetration <= 0) continue;

						const inverseMassA = a === lockedIndex ? 0 : 1;
						const inverseMassB = b === lockedIndex ? 0 : 1;
						const totalMass = inverseMassA + inverseMassB;

						if (totalMass === 0) continue;

						next[a] -= penetration * inverseMassA / totalMass;
						next[b] += penetration * inverseMassB / totalMass;

						const relativeVelocity = nextVelocity[a] - nextVelocity[b];

						if (relativeVelocity > 0) {
							const impulse = (1 + C.COLLISION_BOUNCE)
								* relativeVelocity / totalMass;

							nextVelocity[a] -= impulse * inverseMassA;
							nextVelocity[b] += impulse * inverseMassB;
						}
					}
				}
			}

			currentPositions = next;
			currentVelocities = nextVelocity;
		}

		let moving = lockedIndex >= 0;

		if (!moving) {
			for (let i = 0; i < C.TOTAL_POINTS; i++) {
				if (
					Math.abs(currentPositions[i]) > 0.05 ||
					Math.abs(currentVelocities[i]) > 0.5
				) {
					moving = true;
					break;
				}
			}
		}

		if (!moving) {
			positions.value = Array(C.TOTAL_POINTS).fill(0);
			velocities.value = Array(C.TOTAL_POINTS).fill(0);
			isRunning.value = false;
			return;
		}

		positions.value = currentPositions;
		velocities.value = currentVelocities;
	});

	return (
		<View style={styles.container}>
			<GestureDetector gesture={gesture}>
				<View style={{ width, height: C.CANVAS_HEIGHT }}>
					<Canvas style={{ width, height: C.CANVAS_HEIGHT }}>
						<GlowingString path={bluePath} color={blueColor} />
						<GlowingString path={redPath} color={redColor} />
						<GlowingString path={greenPath} color={greenColor} />
					</Canvas>
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


import { type FC } from "react";

import { BlurMask, Path, type SkPath } from "@shopify/react-native-skia";
import type { DerivedValue } from "react-native-reanimated";

import { GlowingLines as C } from "../constants";

type TGlowingStringProps = {
	path: DerivedValue<SkPath>;
	color: DerivedValue<string>;
};

export const GlowingString: FC<TGlowingStringProps> = ({ path, color }) => {
	return (
		<>
			<Path
				path={path}
				style="stroke"
				color={color}
				strokeWidth={32}
				opacity={0.18 * C.GLOW_INTENSITY}
			>
				<BlurMask blur={35} style="normal" />
			</Path>

			<Path
				path={path}
				style="stroke"
				color={color}
				strokeWidth={14}
				opacity={0.35 * C.GLOW_INTENSITY}
			>
				<BlurMask blur={15} style="normal" />
			</Path>

			<Path
				path={path}
				style="stroke"
				color={color}
				strokeWidth={5}
				opacity={0.8 * C.GLOW_INTENSITY}
			>
				<BlurMask blur={5} style="normal" />
			</Path>

			<Path
				path={path}
				style="stroke"
				color={color}
				strokeWidth={C.LINE_WIDTH}
			/>

			<Path
				path={path}
				style="stroke"
				color={C.WHITE_COLOR}
				strokeWidth={0.8}
			/>
		</>
	);
};

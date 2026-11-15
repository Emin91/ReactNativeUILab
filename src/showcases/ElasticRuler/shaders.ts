import { Skia } from "@shopify/react-native-skia";

export const DIRECTIONAL_GLOW_EFFECT = Skia.RuntimeEffect.Make(`
  uniform float lineX;
  uniform float bend;
  uniform float centerY;
  uniform float halfHeight;
  uniform float glowWidth;
  uniform float intensity;

  half4 main(float2 position) {
    float verticalDistance = abs(position.y - centerY);
    float progress = clamp(1.0 - verticalDistance / halfHeight, 0.0, 1.0);
    float influence = progress * progress * (3.0 - 2.0 * progress);
    float curvedX = lineX - bend * influence;
    float sideDistance = curvedX - position.x;
    float sideMask = smoothstep(-4.0, 10.0, sideDistance);
    float normalizedDistance = max(sideDistance, 0.0) / glowWidth;
    float horizontalGlow = exp(-0.5 * normalizedDistance * normalizedDistance);
    float verticalGlow = pow(influence, 0.85);

    float alpha = clamp(
      intensity * sideMask * horizontalGlow * verticalGlow,
      0.0,
      1.0
    );

    float3 color = float3(170.0 / 255.0, 239.0 / 255.0, 42.0 / 255.0);

    return half4(color * alpha, alpha);
  }
`);

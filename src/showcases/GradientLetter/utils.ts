export const mixWithWhite = (hex: string, amount: number) => {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount);

  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

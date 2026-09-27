export function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function seedRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* deterministic sample series that ends exactly at `end` and drifts from a start set by `startRatio` */
export function genSeries(seedStr, end, points, startRatio) {
  const rnd = seedRandom(seedFromString(seedStr));
  let val = end * startRatio;
  const out = [val];
  for (let i = 1; i < points; i++) {
    const pull = ((end - val) / (points - i)) * 0.6;
    const noise = (rnd() - 0.5) * end * 0.018;
    val += pull + noise;
    out.push(val);
  }
  out[out.length - 1] = end;
  return out;
}

/* linear resample so two series of different lengths can share an x-axis */
export function resample(arr, n) {
  if (!arr || arr.length === n) return arr;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * (arr.length - 1);
    const lo = Math.floor(t), hi = Math.ceil(t);
    return arr[lo] + (arr[hi] - arr[lo]) * (t - lo);
  });
}

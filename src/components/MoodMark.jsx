/*
  The market's two animals, reduced to the gesture each is named for:
  a bull thrusts its horns up, a bear swipes its claws down.
  Bull: two tapered horns curling upward. Bear: three tapered claw marks slashing down.
  Sideways: a level drift. Outlines draw in once per mood change, then the shapes fill softly.
*/
const SHAPES = {
  bull: [
    // left horn: thick at the head, sweeping out and curling up to a point
    'M114 96 C72 98 30 84 22 52 C18 34 28 18 44 8 C38 20 36 34 42 48 C52 70 80 80 114 82 Z',
    // right horn, mirrored
    'M126 96 C168 98 210 84 218 52 C222 34 212 18 196 8 C202 20 204 34 198 48 C188 70 160 80 126 82 Z',
  ],
  bear: [
    'M58 6 C76 40 88 74 94 114 C84 78 72 44 58 6 Z',
    'M104 2 C122 38 134 74 140 116 C130 78 118 42 104 2 Z',
    'M150 6 C168 40 180 74 186 114 C176 78 164 44 150 6 Z',
  ],
};
const FLAT = 'M20 64 C56 52 84 74 120 62 S184 52 220 62';

export default function MoodMark({ mood = 'flat', className = '', strokeWidth = 1.6, title, style }) {
  return (
    <svg
      key={mood}
      viewBox="0 0 240 120"
      className={className}
      style={style}
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {mood === 'flat' ? (
        <path d={FLAT} pathLength="1" className="mood-stroke" stroke="var(--mood)" strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ) : (
        SHAPES[mood].map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength="1"
            className="mood-stroke mood-fill"
            stroke="var(--mood)"
            fill="var(--mood)"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${i * 0.16}s, ${0.9 + i * 0.16}s` }}
          />
        ))
      )}
    </svg>
  );
}

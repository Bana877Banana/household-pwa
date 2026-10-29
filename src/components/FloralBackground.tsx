import type { CSSProperties } from "react";
import "./FloralBackground.css";

type FlowerStyle = CSSProperties & {
  "--flower-left": string;
  "--flower-size": string;
  "--flower-opacity": number;
  "--flower-duration": string;
  "--flower-delay": string;
  "--flower-rotation": string;
  "--flower-sway": string;
  "--flower-static-top": string;
};

const flowers = [
  { x: 3, size: 68, opacity: .28, duration: 69, delay: -48, rotation: 82, sway: 30, top: 7 },
  { x: 82, size: 56, opacity: .24, duration: 83, delay: -15, rotation: 57, sway: -26, top: 17 },
  { x: 14, size: 33, opacity: .23, duration: 58, delay: -28, rotation: 93, sway: 25, top: 31 },
  { x: 90, size: 72, opacity: .22, duration: 97, delay: -69, rotation: 77, sway: -30, top: 44 },
  { x: 61, size: 37, opacity: .20, duration: 74, delay: -51, rotation: 62, sway: 22, top: 58 },
  { x: 1, size: 51, opacity: .24, duration: 88, delay: -77, rotation: 105, sway: 38, top: 72 },
  { x: 72, size: 29, opacity: .25, duration: 66, delay: -36, rotation: 71, sway: -20, top: 85 },
  { x: 36, size: 42, opacity: .18, duration: 91, delay: -8, rotation: 89, sway: 29, top: 93 },
];

function Flower({ index }: { index: number }) {
  const palette = [
    ["#f4a6ba", "#ffd6e0", "#f4c66b"],
    ["#ffe0d7", "#f6b3ae", "#f3c36c"],
    ["#ffffff", "#fce2d9", "#f2c36e"],
    ["#f5b8c8", "#fbe1e8", "#edc277"],
  ][index % 4];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="50" cy="27" rx="17" ry="27"
          transform={`rotate(${i * 72} 50 50)`}
          fill={i % 2 === 0 ? palette[0] : palette[1]} />
      ))}
      <circle cx="50" cy="50" r="12" fill={palette[2]} />
      <circle cx="46" cy="46" r="3" fill="#fff8d7" opacity=".8" />
    </svg>
  );
}

export function FloralBackground() {
  return (
    <div className="floral-background" aria-hidden="true">
      {flowers.map((flower, index) => {
        const style: FlowerStyle = {
          "--flower-left": `${flower.x}%`,
          "--flower-size": `${flower.size}px`,
          "--flower-opacity": flower.opacity,
          "--flower-duration": `${flower.duration}s`,
          "--flower-delay": `${flower.delay}s`,
          "--flower-rotation": `${flower.rotation}s`,
          "--flower-sway": `${flower.sway}px`,
          "--flower-static-top": `${flower.top}%`,
        };
        return <span className="floral-background__flower" style={style} key={index}><Flower index={index} /></span>;
      })}
    </div>
  );
}

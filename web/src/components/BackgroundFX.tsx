import { Aurora } from "./Aurora";

export function BackgroundFX() {
  return (
    <>
      <div className="mesh-bg" />
      <Aurora />
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="scanlines" />
      <div className="grain" />
    </>
  );
}

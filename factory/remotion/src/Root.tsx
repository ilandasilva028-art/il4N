import React from 'react';
import { Composition } from 'remotion';
import { Montage, MontageProps } from './Montage';

// Une seule composition, pilotée par les props : la fiche MONTAGE du film, la variante d'accroche,
// la vidéo « propre » et le son (fichiers copiés dans public/ par engine/render/montage.ts).
const defaults: MontageProps = {
  variant: 'a', video: 'clean.mp4', audio: 'mix.wav',
  spec: { fps: 60, duration: 1, hook: { a: [], b: [], line2At: 1, end: 1 }, bands: [], titles: [], cards: [], tips: [], lines: [], cuts: [] },
};
export const Root: React.FC = () => (
  <Composition
    id="Montage"
    component={Montage}
    width={1080}
    height={1920}
    fps={60}
    durationInFrames={60}
    defaultProps={defaults}
    calculateMetadata={({ props }) => ({ fps: props.spec.fps, durationInFrames: Math.round(props.spec.duration * props.spec.fps) })}
  />
);

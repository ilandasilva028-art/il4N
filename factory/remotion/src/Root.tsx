import React from 'react';
import { Composition } from 'remotion';
import { Potager, potagerDuration } from './Potager';

// Montage Remotion : l'image vient du moteur canvas (rendu « propre » ?v=clean, sans textes ni transitions),
// le son vient du mixeur du moteur (timing identique). Remotion ajoute textes animés, compteur, barre de progression
// et transitions appliquées à l'image.
export const Root: React.FC = () => (
  <Composition
    id="Potager"
    component={Potager}
    durationInFrames={potagerDuration}
    fps={60}
    width={1080}
    height={1920}
    defaultProps={{ variant: 'a' as 'a' | 'b' }}
  />
);

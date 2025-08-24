import React, { PropsWithChildren } from 'react';

// Cardio timers removed. This is a no-op stub kept to avoid breaking imports.
export function useCardioSession(): never {
  throw new Error('Cardio timers have been removed.');
}

export function CardioSessionProvider({ children }: PropsWithChildren<{}>) {
  return <>{children}</>;
}

export default CardioSessionProvider;

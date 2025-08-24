// Cardio timers removed; exports replaced with no-ops to avoid broken imports
export function useCardioBackgroundPersistence() {
  return { saveCurrentState: () => {} };
}

export const cardioBackgroundService = {
  generateSessionId: () => 'cardio_removed',
  saveCardioSessionState: async () => Promise.resolve(),
};

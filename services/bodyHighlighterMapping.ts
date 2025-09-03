import type { MuscleId, TrainingLevel } from '../components/anatomy/muscles';

export interface BodyPartData {
  slug: string;
  intensity: number;
  side?: 'left' | 'right';
}

export function mapToBodyHighlighter(
  muscleStates: Partial<Record<MuscleId, TrainingLevel>>,
  muscleVolumes: Partial<Record<MuscleId, number>>
): BodyPartData[] {
  // Map your detailed muscle IDs to Body Highlighter's format
  const mapping: Record<MuscleId, string | string[]> = {
    chest: 'chest',
    biceps: 'biceps',
    triceps: 'triceps',
    frontDelts: 'deltoids',
    sideDelts: 'deltoids', 
    rearDelts: 'deltoids',
    forearms: 'forearm',
    abs: 'abs',
    obliques: 'obliques',
    quads: 'quadriceps',
    hamstrings: 'hamstring',
    calves: 'calves',
    glutes: 'gluteal',
    upperTraps: 'trapezius',
    midTraps: 'trapezius',
    lowerTraps: 'trapezius',
    lats: 'upper-back',
    rhomboids: 'upper-back',
    lowerBack: 'lower-back',
    traps: 'trapezius',
    neck: 'head',
    adductors: 'adductors',
    abductors: 'adductors', // Body Highlighter doesn't have separate abductors
    shins: 'tibialis',
    rotatorCuffs: 'upper-back' // Map to upper-back since no specific rotator cuff in Body Highlighter
  };

  const result: BodyPartData[] = [];
  
  Object.entries(muscleStates).forEach(([muscleId, level]) => {
    const bodyPart = mapping[muscleId as MuscleId];
    if (!bodyPart) return;
    
    const intensity = getIntensityFromLevel(level);
    
    if (Array.isArray(bodyPart)) {
      bodyPart.forEach(part => {
        result.push({ slug: part, intensity });
      });
    } else {
      result.push({ slug: bodyPart, intensity });
    }
  });
  
  // Remove duplicates by slug and take highest intensity
  const deduped = new Map<string, number>();
  result.forEach(({ slug, intensity }) => {
    if (!deduped.has(slug) || deduped.get(slug)! < intensity) {
      deduped.set(slug, intensity);
    }
  });
  
  return Array.from(deduped.entries()).map(([slug, intensity]) => ({
    slug,
    intensity
  }));
}

function getIntensityFromLevel(level: TrainingLevel): number {
  switch(level) {
    case 'untrained': return 1;
    case 'undertrained': return 2;
    case 'optimal': return 3;
    case 'overtrained': return 4;
    default: return 1;
  }
}

import type { Exercise } from '@/types'

export const exercises: Exercise[] = [
  {
    id: 1,
    name: 'Seated Ankle Pumps',
    category: 'Range of Motion',
    targetArea: 'Lower Limb',
    difficulty: 'Easy',
    duration: '2–3 minutes',
    repetitions: '10–15 repetitions',
    instructions: ['Sit with both feet supported.', 'Point your toes away slowly.', 'Pull your toes back toward you.', 'Repeat with controlled movement.'],
    benefits: 'Encourages gentle ankle movement and circulation.',
    safety: 'Move slowly and stay within a comfortable range. Stop if pain or unusual symptoms occur.'
  },
  {
    id: 2,
    name: 'Ankle Alphabet',
    category: 'Range of Motion',
    targetArea: 'Lower Limb',
    difficulty: 'Easy',
    duration: '2–4 minutes',
    repetitions: '1 alphabet per side',
    instructions: ['Sit comfortably.', 'Lift one foot slightly.', 'Trace small letters in the air using your foot.', 'Repeat on the other side if appropriate.'],
    benefits: 'Promotes controlled ankle range of motion.',
    safety: 'Keep the movement small and controlled. Use support if needed.'
  },
  {
    id: 3,
    name: 'Resisted Dorsiflexion',
    category: 'Strength',
    targetArea: 'Lower Limb',
    difficulty: 'Moderate',
    duration: '3–5 minutes',
    repetitions: '8–10 repetitions',
    instructions: ['Sit with the leg supported.', 'Use appropriate light resistance if cleared.', 'Pull the foot upward slowly.', 'Return to the starting position with control.'],
    benefits: 'Targets muscles involved in lifting the foot.',
    safety: 'Use only light resistance and follow professional guidance when resistance training is not yet appropriate.'
  },
  {
    id: 4,
    name: 'Supported Heel Raises',
    category: 'Strength',
    targetArea: 'Lower Limb',
    difficulty: 'Easy',
    duration: '3–5 minutes',
    repetitions: '8–12 repetitions',
    instructions: ['Stand behind a stable support.', 'Hold the support with both hands.', 'Slowly raise your heels.', 'Lower your heels with control.'],
    benefits: 'Builds lower-leg strength used during standing and walking.',
    safety: 'Keep a stable support nearby. Use supervision if balance is limited.'
  },
  {
    id: 5,
    name: 'Sit-to-Stand from Chair',
    category: 'Strength',
    targetArea: 'Lower Limb',
    difficulty: 'Moderate',
    duration: '3–5 minutes',
    repetitions: '5–10 repetitions',
    instructions: ['Use a stable chair.', 'Place both feet firmly on the floor.', 'Lean forward slightly and stand.', 'Slowly sit back down with control.'],
    benefits: 'Practices a functional movement used in daily activities.',
    safety: 'Use armrests or supervision when needed. Make sure the chair cannot slide.'
  },
  {
    id: 6,
    name: 'Supported Mini Squats',
    category: 'Strength',
    targetArea: 'Lower Limb',
    difficulty: 'Moderate',
    duration: '3–5 minutes',
    repetitions: '8–12 repetitions',
    instructions: ['Stand while holding stable support.', 'Bend your hips and knees slightly.', 'Keep your heels down.', 'Return to standing slowly.'],
    benefits: 'Provides gentle lower-limb strengthening.',
    safety: 'Use support throughout. Avoid deep bending if it causes pain or instability.'
  },
  {
    id: 9,
    name: 'Supported Over-Ground Walking',
    category: 'Mobility',
    targetArea: 'Lower Limb',
    difficulty: 'Moderate',
    duration: '5–10 minutes',
    repetitions: 'Short, supervised bouts',
    instructions: ['Choose a clear and safe walking path.', 'Use the assistive device recommended by a professional if applicable.', 'Walk at a comfortable pace.', 'Rest as needed.'],
    benefits: 'Provides practice for walking tolerance and functional endurance.',
    safety: 'Use supervision or an appropriate assistive device when needed. Avoid walking alone when fall risk is present.'
  },
  {
    id: 10,
    name: 'Seated Leg Cycling',
    category: 'Mobility',
    targetArea: 'Lower Limb',
    difficulty: 'Advanced',
    duration: '5–10 minutes',
    repetitions: 'Short intervals',
    instructions: ['Use an appropriate seated cycle device.', 'Begin with low resistance.', 'Pedal at a comfortable pace.', 'Rest between intervals as needed.'],
    benefits: 'Provides low-impact lower-limb endurance practice.',
    safety: 'Use only when appropriate for the person and cleared by a qualified professional, especially soon after stroke.'
  }
]

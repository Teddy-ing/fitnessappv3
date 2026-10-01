/**
 * Practical starting programs, not claims of a universally optimal split.
 * Design references: ACSM 2026 resistance-training position stand;
 * Ramos-Campo et al. 2024 (doi:10.1519/JSC.0000000000004774);
 * WHO 2020 physical-activity guidelines; Konrad et al. 2024 stretching review
 * (PubMed 37301370). Weekly schedules are Monday through Sunday.
 */
export interface StarterWorkoutDefinition {
    name: string;
    exercises: { id: string; sets: number; note: string }[];
}

export interface StarterPlanDefinition {
    id: string;
    name: string;
    description: string;
    goals: ('strength' | 'muscle' | 'fitness' | 'endurance' | 'mobility')[];
    workouts: StarterWorkoutDefinition[];
    schedule: (number | null)[];
}

const COMPOUND = '6–10 reps. Keep 2 reps in reserve; rest 2–3 min.';
const ACCESSORY = '10–15 reps. Keep 1–3 reps in reserve; rest 60–90 sec.';
const BODYWEIGHT = '6–15 controlled reps. Use a variation that leaves 2 reps in reserve; rest 90 sec.';
const STRETCH = 'Hold 20–30 sec per side at mild tension, breathing normally. Avoid painful ranges.';
const GENERAL = 'Warm up for 5–10 min and use lighter practice sets before loaded lifts. Listed sets are working sets. When every set reaches the top of its rep range with control, add the smallest available load.';
const ex = (id: string, sets = 3, note = COMPOUND) => ({ id, sets, note });
const workout = (name: string, exercises: StarterWorkoutDefinition['exercises']): StarterWorkoutDefinition => ({ name, exercises });

const push = () => [
    ex('bench-press-barbell', 3), ex('incline-bench-press-dumbbell', 2),
    ex('overhead-press-dumbbell', 2), ex('lateral-raise', 2, ACCESSORY), ex('tricep-pushdown', 2, ACCESSORY),
];
const pull = () => [
    ex('lat-pulldown', 3), ex('bent-over-row-barbell', 3),
    ex('rear-delt-fly', 2, ACCESSORY), ex('barbell-curl', 2, ACCESSORY), ex('hammer-curl', 2, ACCESSORY),
];
const legs = () => [
    ex('squat-barbell', 3), ex('romanian-deadlift', 3), ex('leg-press', 2),
    ex('leg-curl-seated', 2, ACCESSORY), ex('calf-raise-standing', 3, ACCESSORY),
];
const upperA = () => [
    ex('bench-press-barbell', 3), ex('lat-pulldown', 3), ex('bent-over-row-dumbbell', 2),
    ex('overhead-press-dumbbell', 2), ex('lateral-raise', 2, ACCESSORY),
    ex('dumbbell-curl', 2, ACCESSORY), ex('tricep-pushdown', 2, ACCESSORY),
];
const lowerA = () => [
    ex('squat-barbell', 3), ex('romanian-deadlift', 3), ex('leg-extension', 2, ACCESSORY),
    ex('leg-curl-seated', 2, ACCESSORY), ex('calf-raise-standing', 3, ACCESSORY),
    ex('plank', 2, 'Hold 20–45 sec with steady breathing. Rest 45–60 sec.'),
];
const fullA = () => [
    ex('squat-barbell', 3), ex('bench-press-barbell', 3), ex('lat-pulldown', 3),
    ex('romanian-deadlift', 2), ex('lateral-raise', 2, ACCESSORY),
    ex('plank', 2, 'Hold 20–45 sec with steady breathing. Rest 45–60 sec.'),
];
const fullB = () => [
    ex('leg-press', 3), ex('overhead-press-dumbbell', 2), ex('seated-cable-row', 3),
    ex('dumbbell-floor-press', 3), ex('leg-curl-seated', 3, ACCESSORY), ex('calf-raise-standing', 2, ACCESSORY),
];
const homeA = () => [
    ex('dumbbell-goblet-squat', 3), ex('dumbbell-floor-press', 3),
    ex('bent-over-row-dumbbell', 3, `${COMPOUND} Hinge at the hips and row without a bench.`),
    ex('dumbbell-romanian-deadlift', 3), ex('plank', 2, 'Hold 20–45 sec; rest 45–60 sec.'),
];

export const STARTER_PLANS: StarterPlanDefinition[] = [
    {
        id: 'premade_ppl', name: 'Push Pull Legs', goals: ['muscle', 'strength'],
        description: `Six lifting days: push, pull, legs, repeated, then rest. Each session has 11–13 working sets. Choose a lower-frequency plan if recovery or schedule makes six days difficult. ${GENERAL}`,
        workouts: [workout('Push Day', push()), workout('Pull Day', pull()), workout('Leg Day', legs())],
        schedule: [0, 1, 2, 0, 1, 2, null],
    },
    {
        id: 'premade_arnold', name: 'Arnold Split', goals: ['muscle', 'strength'],
        description: `Six single sessions per week: chest/back, shoulders/arms, legs, repeated, then rest. This is a modern, moderate-volume Arnold-style split, with 13–14 working sets per session. ${GENERAL}`,
        workouts: [
            workout('Chest & Back', [ex('bench-press-barbell', 3), ex('lat-pulldown', 3), ex('incline-bench-press-dumbbell', 2), ex('seated-cable-row', 3), ex('chest-fly-dumbbell', 2, ACCESSORY)]),
            workout('Shoulders & Arms', [ex('overhead-press-dumbbell', 2), ex('lateral-raise', 3, ACCESSORY), ex('rear-delt-fly', 2, ACCESSORY), ex('barbell-curl', 3, ACCESSORY), ex('overhead-tricep-extension', 2, ACCESSORY), ex('tricep-pushdown', 2, ACCESSORY)]),
            workout('Legs', legs()),
        ],
        schedule: [0, 1, 2, 0, 1, 2, null],
    },
    {
        id: 'premade_full_body', name: 'Full Body Foundations', goals: ['strength', 'muscle', 'fitness'],
        description: `Three full-body sessions with rest between them. Each day covers a knee-dominant movement, hamstrings/hips, pushing and pulling. Begin with two working sets per exercise if new to lifting. ${GENERAL}`,
        workouts: [
            workout('Full Body A', fullA()), workout('Full Body B', fullB()),
            workout('Full Body C', [ex('front-squat', 3), ex('incline-bench-press-dumbbell', 3), ex('bent-over-row-dumbbell', 3), ex('romanian-deadlift', 2), ex('dumbbell-curl', 2, ACCESSORY), ex('side-plank', 2, 'Hold 20–30 sec per side; rest 45–60 sec.')]),
        ],
        schedule: [0, null, 1, null, 2, null, null],
    },
    {
        id: 'premade_upper_lower', name: 'Upper / Lower', goals: ['strength', 'muscle'],
        description: `Four lifting days, training upper and lower body twice each week. Three rest days leave room for recovery and easy activity. ${GENERAL}`,
        workouts: [
            workout('Upper A', upperA()), workout('Lower A', lowerA()),
            workout('Upper B', [ex('incline-bench-press-dumbbell', 3), ex('seated-cable-row', 3), ex('lat-pulldown', 2), ex('dumbbell-floor-press', 2), ex('rear-delt-fly', 2, ACCESSORY), ex('hammer-curl', 2, ACCESSORY), ex('overhead-tricep-extension', 2, ACCESSORY)]),
            workout('Lower B', [ex('leg-press', 3), ex('romanian-deadlift', 3), ex('lunge-dumbbell', 2, `${COMPOUND} Reps are per leg.`), ex('leg-curl-seated', 2, ACCESSORY), ex('calf-raise-standing', 3, ACCESSORY), ex('side-plank', 2, 'Hold 20–30 sec per side; rest 45–60 sec.')]),
        ],
        schedule: [0, 1, null, 2, 3, null, null],
    },
    {
        id: 'premade_bodybuilding', name: 'Five-Day Muscle Builder', goals: ['muscle', 'strength'],
        description: `Upper/lower followed by push/pull/legs gives every major muscle group two weekly exposures, including legs. Five lifting days and two rest days; start with fewer sets if needed. ${GENERAL}`,
        workouts: [workout('Upper Body', upperA()), workout('Lower Body', lowerA()), workout('Push', push()), workout('Pull', pull()), workout('Legs', legs())],
        schedule: [0, 1, null, 2, 3, 4, null],
    },
    {
        id: 'premade_home_dumbbell', name: 'Home Dumbbell Full Body', goals: ['strength', 'muscle', 'fitness'],
        description: `Three full-body sessions using dumbbells and floor space. No bench or machines required. For one-sided exercises, complete both sides as one set. ${GENERAL}`,
        workouts: [
            workout('Dumbbell A', homeA()),
            workout('Dumbbell B', [ex('lunge-dumbbell', 3, `${COMPOUND} Reps are per leg.`), ex('overhead-press-dumbbell', 3, `${COMPOUND} Perform standing; no bench needed.`), ex('bent-over-row-dumbbell', 3, `${COMPOUND} Use an unsupported hip hinge.`), ex('dumbbell-romanian-deadlift', 3), ex('push-up', 2, BODYWEIGHT)]),
            workout('Dumbbell C', [ex('dumbbell-goblet-squat', 3), ex('dumbbell-floor-press', 3), ex('bent-over-row-dumbbell', 3, `${COMPOUND} Use an unsupported hip hinge.`), ex('dumbbell-romanian-deadlift', 3), ex('side-plank', 2, 'Hold 20–30 sec per side; rest 45–60 sec.')]),
        ],
        schedule: [0, null, 1, null, 2, null, null],
    },
    {
        id: 'premade_calisthenics', name: 'Calisthenics Foundations', goals: ['strength', 'muscle', 'fitness'],
        description: 'Three full-body sessions using bodyweight and a secure pull-up bar. Pull-ups need a bar; this is not an equipment-free plan. Start with controllable push-up and pull-up variations. Warm up, keep two reps in reserve and progress the variation as you get stronger.',
        workouts: [
            workout('Calisthenics A', [ex('bodyweight-squat', 3, BODYWEIGHT), ex('push-up', 3, BODYWEIGHT), ex('pull-up', 3, '3–8 controlled reps; rest 2 min. Use foot assistance only with a safe, stable support. If this is not manageable, choose a row variation using equipment you have.'), ex('hamstring-walkout', 3, '4–8 slow walkouts. Keep hips lifted; shorten the reach to make it easier. Rest 90 sec.'), ex('plank', 2, 'Hold 20–40 sec; rest 45–60 sec.')]),
            workout('Calisthenics B', [ex('reverse-lunge-bodyweight', 3, `${BODYWEIGHT} Reps are per leg.`), ex('pike-push-up', 2, BODYWEIGHT), ex('chin-up', 3, '3–8 controlled reps; rest 2 min. Use foot assistance only with a safe, stable support. If this is not manageable, choose a row variation using equipment you have.'), ex('hamstring-walkout', 3, '4–8 slow walkouts; rest 90 sec.'), ex('push-up', 2, BODYWEIGHT)]),
            workout('Calisthenics C', [ex('bodyweight-squat', 3, '10–20 reps with a slow lowering phase; rest 90 sec.'), ex('push-up', 3, BODYWEIGHT), ex('pull-up', 3, '3–8 controlled reps; rest 2 min.'), ex('hamstring-walkout', 3, '4–8 slow walkouts; rest 90 sec.'), ex('side-plank', 2, 'Hold 20–30 sec per side; rest 45–60 sec.')]),
        ],
        schedule: [0, null, 1, null, 2, null, null],
    },
    {
        id: 'premade_strength_cardio', name: 'Strength + Cardio', goals: ['fitness', 'strength', 'endurance'],
        description: `Two full-body lifting days and two aerobic days. Start with the listed time and build gradually toward 150 min/week of moderate activity, including walks outside these sessions. ${GENERAL}`,
        workouts: [
            workout('Strength A', fullA()),
            workout('Easy Cardio', [ex('brisk-walk', 1, '20–30 min at a pace where you can speak in sentences. Start and finish with 3–5 easy min included in that time.')]),
            workout('Strength B', fullB()),
            workout('Steady Cardio', [ex('outdoor-run', 1, '20–30 min of easy jogging or walk/jog intervals. Keep a conversational effort; include 5 easy min at each end. Walking for the whole session is fine.')]),
        ],
        schedule: [0, 1, null, 2, null, 3, null],
    },
    {
        id: 'premade_endurance', name: 'Aerobic Base', goals: ['endurance', 'fitness'],
        description: 'Four aerobic sessions to build a consistent endurance base. Most work stays conversational. Begin at the lower time limit and increase one session at a time as it feels comfortable; build toward 150 min/week of moderate activity. This cardio-only plan does not include strength training.',
        workouts: [
            workout('Easy Walk / Jog', [ex('outdoor-run', 1, '20–30 min conversational jogging or alternating 1 min jog / 2 min walk. Include 5 easy min at the start and finish.')]),
            workout('Brisk Walk', [ex('brisk-walk', 1, '25–40 min at a sustainable pace. You should be able to talk; slow down for the first and last 5 min.')]),
            workout('Easy Aerobic', [ex('outdoor-run', 1, '20–30 min easy jog or walk/jog. Keep this easy, with 5 gentle min at either end.')]),
            workout('Long Easy Walk / Jog', [ex('brisk-walk', 1, '35–50 min of comfortable walking or walk/jog. Start shorter if needed; maintain conversational effort throughout.')]),
        ],
        schedule: [0, null, 1, 2, null, 3, null],
    },
    {
        id: 'premade_mobility', name: 'Stretch & Move', goals: ['mobility', 'fitness'],
        description: 'Three gentle 10–20 min mobility sessions using floor space. Start with a few minutes of easy movement, then move slowly and hold stretches at mild tension. Each set includes both sides where relevant. This flexibility plan does not replace aerobic or strength training.',
        workouts: [
            workout('Whole-Body Mobility', [ex('standing-cat-cow', 2, '6–10 slow reps, hands on thighs. Move through a comfortable range.'), ex('thoracic-rotation', 2, '6–10 slow rotations per side on the floor.'), ex('hip-flexor-stretch', 2, STRETCH), ex('hamstring-stretch', 2, STRETCH), ex('chest-stretch', 2, STRETCH)]),
            workout('Hips & Legs', [ex('bodyweight-squat', 2, '6–10 easy reps through a comfortable range. This is gentle movement, not a hard set.'), ex('hip-flexor-stretch', 2, STRETCH), ex('hamstring-stretch', 2, STRETCH), ex('quad-stretch', 2, STRETCH), ex('calf-stretch', 2, STRETCH)]),
            workout('Upper-Body Mobility', [ex('standing-cat-cow', 2, '6–10 slow reps with hands on thighs.'), ex('thoracic-rotation', 2, '6–10 slow rotations per side on the floor.'), ex('chest-stretch', 2, STRETCH), ex('shoulder-stretch', 2, STRETCH), ex('prone-y-raise', 2, '8–12 gentle reps. Reach long and lift the arms slightly; keep the neck relaxed.')]),
        ],
        schedule: [0, null, 1, null, 2, null, null],
    },
];

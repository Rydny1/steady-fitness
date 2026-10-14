// All app copy. Two voices: the app (plain, neutral) and the Gaffer (GAME.md).
// No emoji, no exclamation marks, no long dashes.

import type { DivisionT, NotifyKindT } from "@/lib/supabase/types";

export const copy = {
  login: {
    title: "One steady day at a time.",
    sub: "Sign in to log today.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    forgot: "Forgot password",
    privacy: "Private. Your logs, numbers and photos are visible only to you.",
    error: "Email or password is wrong",
    forgotTitle: "Reset your password",
    forgotSub: "Enter your email and Steady sends a link.",
    forgotSent: "If that email has an account, a link is on its way.",
    forgotSubmit: "Send link",
    updateTitle: "Choose a new password",
    updateSub: "At least 12 characters.",
    updateSubmit: "Save password",
  },
  mfa: {
    setupTitle: "Add two-step sign-in",
    setupSub:
      "Scan this code with an authenticator app, then enter the 6 digits it shows.",
    secretLabel: "Or type this key",
    codeLabel: "6-digit code",
    verify: "Verify",
    challengeTitle: "Enter your code",
    challengeSub: "Open your authenticator app and type the 6 digits.",
    error: "That code is wrong. Try the next one.",
  },
  greeting: {
    morning: (n: string) => `Morning, ${n}.`,
    afternoon: (n: string) => `Afternoon, ${n}.`,
    evening: (n: string) => `Evening, ${n}.`,
  },
  nav: {
    today: "Today",
    train: "Train",
    log: "Log",
    fuel: "Fuel",
    progress: "Progress",
  },
  today: {
    emptyLog: "Nothing logged yet. Tap the mic and say what you did.",
    promises: "Five promises",
    todayLog: "Today",
    todaysLine: "Today's line",
    gaffer: "The Gaffer",
    youAre: "You are",
    callus: "Callus",
    vsLastWeek: "You vs last week",
    streak: "day streak",
    career: "days in career",
    trophies: "trophies",
    start: "Start",
    ringFuel: "Fuel",
    ringProtein: "Protein",
    ringTrain: "Train",
    left: (n: string) => `${n} kcal left.`,
    over: (n: string) => `${n} kcal over.`,
    sessionToDo: (s: string) => `${s} still to do.`,
    restDay: "Rest day.",
    chapterLine: (n: number, name: string) => `Chapter ${n}, ${name}`,
    toNext: (days: number, name: string) => `${days} days to ${name}`,
    atTop: "Top of the ladder",
    barBar: "Callus needs to reach the bar for the next chapter",
    logs: (n: number) => (n === 1 ? "1 log" : `${n} logs`),
    of: (a: number, b: number) => `${a} of ${b}`,
    sickDay: "Sick day. Streak paused.",
    noGhost: "No ghost yet. This week you set the bar.",
  },
  log: {
    title: "Log",
    voice: "Voice",
    photo: "Photo",
    type: "Type",
    listening: "Listening",
    tapToSpeak: "Tap the mic and say what you did.",
    typePlaceholder: "Skyr with berries, 2 eggs, football 60 min",
    parse: "Read it",
    save: "Save log",
    check: "Check this",
    total: "Running total",
    estimate: "Estimate from photo",
    voiceUnsupported: "Voice isn't available in this browser. Type it instead.",
    parseFailed:
      "Couldn't read that log. Your words are saved. Try again or enter it by hand.",
    aiLimit: "AI is resting for today. Enter it by hand, it still counts.",
    offline: "Offline. Your log will send when you're back.",
    queued: (n: number) => `${n} waiting to send`,
    saved: "Saved.",
    unclear: "Couldn't place",
    savedFoods: "Saved foods",
    scan: "Scan a barcode",
    scanUnsupported: "Barcode scanning isn't available in this browser.",
    scanNotFound: "Not found. Use a photo or say it instead.",
    grams: "Grams",
    addByHand: "Add by hand",
    kcal: "kcal",
    protein: "g protein",
    remove: "Remove",
  },
  train: {
    title: "Train",
    startSession: "Start session",
    finish: "Finish session",
    markDone: "Mark done",
    swap: "Swap",
    library: "Library",
    coverage: "This week",
    how: "How",
    tip: "Tip",
    works: "Works",
    lastTime: "Last time",
    restTimer: "Rest",
    next: "Next",
    newBest: "New best",
    add: (kg: string) => `+${kg} kg`,
    addRep: "+1 rep",
    stretch: "Stretch routine",
    rest: "Rest day",
    football: "Football",
    run: "Easy run",
    runDesc: "30 min at talking pace",
    intervals: "Intervals",
    intervalsDesc: "5 min easy, 8 x (1 min hard, 2 min easy), 5 min easy",
    offerIntervals: "Four good weeks in a row. Add Sunday intervals?",
    addIntervals: "Add intervals",
  },
  fuel: {
    title: "Fuel",
    prep: "This week's prep",
    pickTwo: "Pick 2 recipes for Sunday",
    pickThursday: "Pick 1 for Thursday night",
    shopping: "Shopping list",
    quickBuys: "Quick buys",
    plates: "Your plates",
    steps: "Sunday prep",
    portions: "4 portions",
    fridge: "Fridge: 3 days max. Freeze anything for day 4.",
  },
  progress: {
    title: "Progress",
    challenges: "Challenges",
    range: { week: "Week", month: "Month", threeMonths: "3 months", all: "All" },
    weight: "Weight",
    calories: "Calories",
    body: "Body",
    noticed: "The Gaffer noticed",
    trophyRoom: "Trophies",
    photos: "Photos",
    weekRings: "Week",
    weightEmpty:
      "Two weigh-ins start the trend. Morning, after the toilet, before food.",
    photosEmpty: "No photos yet. Front, side, back. Same spot, every two weeks.",
    mealPhotosEmpty: "Photos of your meals show up here.",
    patternsEmpty: "Two weeks of logs and I'll tell you what I see.",
    weighIn: "Weigh in",
    addPhoto: "Add photo",
    compare: "Compare",
    records: "Records",
    pickChallenge: "Pick this week's challenge",
    picked: "Your challenge",
    reward: "+6 Callus",
    answerBack: "Answer back",
    answerBackLine:
      "Log every day and do every planned session for 3 days. Half the Callus you lost comes back.",
    goalDate: (kg: string, date: string) => `Goal ${kg} kg around ${date} at this pace.`,
    noGoalDate: "At this pace there's no goal date. The trend has to fall first.",
    weeklyReport: "Weekly report",
    sevenDay: "7-day average",
    lossRate: "Weekly loss rate",
    waistHeight: "Waist to height",
    bodyFat: "Body fat est.",
    bmi: "BMI",
    photoDay: "Photo day. Same spot, same light, morning.",
  },
  checkin: {
    title: "Evening check-in",
    sleep: "Sleep, hours",
    energy: "Energy, 1 to 5",
    water: "Water, litres",
    cravings: "Cravings or overeating. Notice, don't judge.",
    sick: "Sick day",
    sickHelp: "Pauses the streak. Max 3 a month.",
    sickLimit: "3 sick days used this month.",
    save: "Save check-in",
  },
  settings: {
    title: "Profile",
    targets: "Targets",
    plan: "Plan",
    account: "Account",
    yourData: "Your data",
    export: "Export my data",
    importOld: "Import old Steady",
    privacy: "Privacy note",
    deleteAll: "Delete everything",
    deleteConfirm:
      "This deletes every log, number and photo. It can't be undone. Type DELETE.",
    signOut: "Sign out",
    notifications: "Notifications",
    security: "Two-step sign-in",
    privacyText: [
      "Stored: your logs, numbers, workouts and photos, in a private database in the EU.",
      "Who can see it: only you. Photos sit in private storage and open with links that expire after an hour.",
      "Sent to Gemini: the text of your logs, facts computed from your numbers, and a meal photo only when you tap Estimate. Progress photos never leave storage.",
      "Chrome's voice typing sends audio to Google to turn it into text.",
      "No analytics, no trackers, no ads.",
    ],
  },
  onboarding: {
    title: "Set up Steady",
    sub: "Eight answers. Then Steady sets your budget.",
    name: "What should Steady call you?",
    height: "Height in cm",
    birth: "Birth date",
    sex: "Sex, for the calorie formula",
    weight: "Current weight in kg",
    goal: "Goal weight in kg",
    waist: "Waist in cm",
    neck: "Neck in cm",
    wake: "Wake time",
    next: "Next",
    done: "Finish",
    budgetTitle: "This is your budget.",
    budgetSub: "Spend it well.",
    pushLine: "Steady sends four kinds of nudges. All can be changed.",
    allow: "Allow notifications",
    skip: "Not now",
    start: "Start",
  },
  errors: {
    generic: "Something went wrong. Try again.",
    signedOut: "Sign in again.",
    invalid: "Check the highlighted fields.",
    tooFast: "Too many tries. Wait a minute.",
  },
  offlineNotice: "Offline. Your log will send when you're back.",
  safety: {
    tooFast:
      "Too fast. You are losing muscle with the fat. Add 200 kcal a day.",
    underBmr: "Under your floor 3 days. Eat. Hunger is not the goal.",
    back: "Skip loaded hinges today. If pain runs down a leg or lasts over 2 weeks, see a physio.",
  },
} as const;

// ---- The Gaffer (GAME.md) ----

export type FormName = "Off form" | "Finding form" | "In form" | "Unplayable";

export const gafferForm: Record<FormName, readonly string[]> = {
  "Off form": [
    "Off form. Happens to everyone. Staying there is optional.",
    "Log today. That's the whole comeback plan.",
    "One good day turns this around. Start with breakfast.",
  ],
  "Finding form": [
    "Finding form. Keep it simple and keep it daily.",
    "Better than last week. Not done yet.",
  ],
  "In form": [
    "In form. Keep it boring and it stays that way.",
    "This is what showing up looks like.",
  ],
  Unplayable: [
    "Unplayable. Now don't get clever.",
    "This is where people relax. Don't.",
  ],
};

export const chapters: Record<
  DivisionT,
  { n: number; name: string; story: string }
> = {
  sunday_league: {
    n: 1,
    name: "Sunday League",
    story:
      "Muddy pitch. Nobody watching. Nobody expects anything. That's your advantage.",
  },
  academy: {
    n: 2,
    name: "Academy",
    story:
      "Someone noticed. Now you train with people who wanted it first. Most will quit. Don't be most.",
  },
  reserves: {
    n: 3,
    name: "Reserves",
    story: "On the bench of a real team. I know your name now.",
  },
  first_team: {
    n: 4,
    name: "First Team",
    story:
      "Squad number. Your name on a shirt. Now the work has to be there every week.",
  },
  starter: {
    n: 5,
    name: "Starter",
    story:
      "Ninety minutes, every week. Other people will notice the change before you do.",
  },
  captain: {
    n: 6,
    name: "Captain",
    story:
      "The armband. Nobody gets it for talent. You get it for being there when it's cold and boring.",
  },
  champions_league: {
    n: 7,
    name: "Champions League",
    story:
      "Bright lights. The work is the same as Sunday League. That's the secret.",
  },
  ballon_dor: {
    n: 8,
    name: "Ballon d'Or",
    story: "A year. Every day accounted for. Look at your first photo.",
  },
};

export const droppedChapter = (name: string) =>
  `Back to ${name}. You know the way up. You've walked it.`;

export const matchLines = {
  noGhost: "No ghost yet. This week you set the bar.",
  winning: "Ahead of last week. Don't ease off.",
  losingRound: (round: string, n: number) =>
    `${round} is the only round you're losing. ${n} good days flip it.`,
  fullTimeWin: (y: number, g: number) =>
    `Full time. ${y} - ${g}. You beat last week's you.`,
  draw: (y: number, g: number) =>
    `${y} - ${g}. Level with yourself. Next week, edge it.`,
  loss: (y: number, g: number, day: string) =>
    `Last week's you won ${g} - ${y}. He's not better than you. He just showed up on ${day}.`,
  perfect: "4 - 0. Last week's you never had a chance.",
  streak: (n: number) => `You've beaten yourself ${n} weeks running.`,
} as const;

export const roundNames = {
  sessions: "Sessions done",
  days_logged: "Days logged",
  fuel_closed: "Fuel ring closed",
  protein_closed: "Protein ring closed",
} as const;

export const challengeCards: Record<
  string,
  { name: string; goal: string; why: string }
> = {
  early_kickoff: {
    name: "Early kickoff",
    goal: "3 gym sessions started before 07:30",
    why: "Picked because you trained after 18:00 three or more times last week.",
  },
  protein_five: {
    name: "Protein five",
    goal: "Protein ring closed 5 of 7 days",
    why: "Picked because the protein ring closed on fewer than 4 days last week.",
  },
  clean_week: {
    name: "Clean week",
    goal: "No day over budget by 10 % or more",
    why: "Picked because 2 or more days went over budget last week.",
  },
  full_ninety: {
    name: "Full ninety",
    goal: "Log every day before 21:00",
    why: "Picked because 2 or more logs landed after 22:00 last week.",
  },
  ten_k_minutes: {
    name: "Long legs",
    goal: "150 walk or run minutes",
    why: "Picked because you walked or ran under 90 minutes last week.",
  },
  photo_day: {
    name: "Photo day",
    goal: "Front, side and back progress photos",
    why: "Picked because there are no progress photos in 14 days.",
  },
  weigh_in_three: {
    name: "Three weigh-ins",
    goal: "Weight logged on 3 days",
    why: "Picked because you weighed in fewer than 2 times last week.",
  },
  sleep_seven: {
    name: "Seven hours",
    goal: "7 or more hours of sleep on 5 nights",
    why: "Picked because your sleep averaged under 6.5 hours last week.",
  },
};

export const trophies = [
  { key: "first_whistle", name: "First whistle", hint: "Log once.", line: "Day one. Most people never get a day two." },
  { key: "seven_straight", name: "Seven straight", hint: "Log 7 days in a row.", line: "A week. Now it's a habit you can lose." },
  { key: "beat_yourself", name: "Beat yourself", hint: "Win a week against last week.", line: "You beat the only rival who matters." },
  { key: "hat_trick", name: "Hat-trick", hint: "Beat yourself 3 weeks running.", line: "Three straight. He's struggling to keep up." },
  { key: "early_riser", name: "Early riser", hint: "Start 10 gym sessions before 08:00.", line: "Ten cold mornings. That's the real gym." },
  { key: "answer_back", name: "Answer back", hint: "Finish an Answer back.", line: "Knocked down. Got up. That's the game." },
  { key: "challenger", name: "Challenger", hint: "Finish 5 weekly challenges.", line: "Five challenges. You pick hard ones." },
  { key: "first_kilo", name: "First kilo", hint: "Get your 7-day average 1 kg down.", line: "One kilo. Nobody noticed. You did." },
  { key: "five_kilos", name: "Five kilos", hint: "Get your 7-day average 5 kg down.", line: "Five kilos. Look at the photos." },
  { key: "waist_down_5", name: "Waist down 5", hint: "Take 5 cm off your waist.", line: "Belt needs a new hole." },
  { key: "ten_bests", name: "Ten bests", hint: "Set 10 lift records.", line: "Stronger than last month. Measurably." },
  { key: "photo_diary", name: "Photo diary", hint: "Take 6 progress photos.", line: "Proof you can see." },
] as const;

export type TrophyKey = (typeof trophies)[number]["key"];

// ---- Notifications (DESIGN.md) ----

export const notificationPools: Record<
  NotifyKindT,
  { title: string; lines: readonly string[] }
> = {
  wake_gym: {
    title: "Gym day",
    lines: [
      "06:30. Feet on the floor.",
      "The bed will still be there tonight. Gym first.",
      "Nobody is coming to drag you there. Go.",
      "You said 06:30. Prove it.",
      "Cold start. Warm by set two.",
    ],
  },
  wake_run: {
    title: "Run day",
    lines: [
      "30 minutes. Easy pace. Shoes on.",
      "Run day. Out the door before you think about it.",
      "Slow kilometres today. They count.",
    ],
  },
  log_nudge: {
    title: "Steady",
    lines: [
      "Nothing logged. The day is ending.",
      "Say what you did. 30 seconds.",
      "Your streak is waiting on one sentence.",
      "Good day or bad day, log it.",
      "Last week's you logged by now.",
    ],
  },
  last_call: {
    title: "Last call",
    lines: [
      "One hour left. Log or lose {streak} days.",
      "Midnight takes the streak. Your call.",
    ],
  },
  weekly: { title: "Full time", lines: [] },
};

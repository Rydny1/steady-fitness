# Steady - the game

Overrides any game copy or rules elsewhere. Numbers live in `features/game/config.ts`. Visual: `design/Main.dc.html` (Today) and `design/Progress.dc.html` (Challenges).

## The idea in one line
Your only opponent is you from last week. Beat him, and next week he's better. The game gets harder exactly as fast as you do.

## Why this design (and what we left out)
| Principle | Source | How Steady uses it |
|---|---|---|
| Competence, autonomy, belonging keep people playing | Self-Determination Theory (Ryan and Rigby, *Glued to Games*) | Visible progress in your own numbers. You pick your weekly challenge. The Gaffer knows you |
| A ghost is the fairest rival | Time-trial ghosts in racing games, Strava segments | You race last week's you, compared at the same point in the week |
| Fun is getting better at something | Raph Koster, *A Theory of Fun* | Difficulty rises automatically because the ghost improves with you |
| Meaning beats points | Yu-kai Chou, Octalysis | Form and chapters say who you are becoming. Points stay in the background |
| Fear burns people out | Octalysis "black hat" drives | Losses cost a little. Nothing ever resets to zero. There's always a way back |
| Surprise rewards hit hardest | Variable reward (Nir Eyal, *Hooked*) | The Gaffer's nod arrives rarely, only when something real happened |
| You become what you repeat | James Clear, identity-based habits | Form names how you're playing this week, never what you look like |
Left out on purpose: a villain character, harsh labels, leaderboards with other people, XP for everything.

## Five pieces
| Piece | Time scale | Where |
|---|---|---|
| Rings | Today | Today, top |
| Form + Callus | This week | Today, form card |
| Challenges: You vs last week, weekly challenge, records | This week | Progress > Challenges, score strip on Today |
| Chapters | Months | Form card, chapter screen on promotion |
| Trophies | Forever | Progress |

## 1. Rings (today)
Three rounded rings, closed = done:
- **Fuel** (green): eaten vs budget. Closes when you end the day within budget and above your floor. Going over shows the ring past full in a darker shade.
- **Protein** (blue): grams vs target.
- **Train** (coral): planned session done. Rest day: 10 min stretch closes it.
Rings close in code from logged data. No AI.

## 2. Form (replaces harsh identity)
Callus 0-100 runs underneath (points in PRODUCT.md). The player sees form, in football terms:
| Callus | Form | The Gaffer (rotate) |
|---|---|---|
| 0-29 | **Off form** | "Off form. Happens to everyone. Staying there is optional." / "Log today. That's the whole comeback plan." / "One good day turns this around. Start with breakfast." |
| 30-59 | **Finding form** | "Finding form. Keep it simple and keep it daily." / "Better than last week. Not done yet." |
| 60-84 | **In form** | "In form. Keep it boring and it stays that way." / "This is what showing up looks like." |
| 85-100 | **Unplayable** | "Unplayable. Now don't get clever." / "This is where people relax. Don't." |

Tone rule: firm, dry, sometimes funny. Never insulting. Talks about this week, never about your body.

## 3. Challenges

### You vs last week (the main event)
Every Monday to Sunday you race last week's you across four rounds:
| Round | Counts |
|---|---|
| Sessions done | Planned sessions completed |
| Days logged | Days with at least one log |
| Fuel ring closed | Days the Fuel ring closed |
| Protein ring closed | Days the Protein ring closed |

- **Fair comparison**: mid-week, you're compared at the same point. Wednesday vs last Wednesday.
- Win a round = more than last week. Same = no point to either.
- Score shown everywhere as "2 - 1". Full time Sunday midnight.
- Win the week: +5 Callus. Lose: -3. Draw: 0.
- Win streak: "You've beaten yourself 5 weeks running."
- Week 1 has no ghost. You set the first bar. Copy: "No ghost yet. This week you set the bar."
- Ghost hard cap: if last week was perfect in a round, matching it counts as a win. Perfect can't be beaten, only repeated.

Lines (Gaffer):
- Live, winning: "Ahead of last week. Don't ease off." / losing a round: "{round} is the only round you're losing. {n} good days flip it."
- Full time win: "Full time. {y} - {g}. You beat last week's you."
- Draw: "{y} - {g}. Level with yourself. Next week, edge it."
- Loss: "Last week's you won {g} - {y}. He's not better than you. He just showed up on {day}."
- Perfect week: "4 - 0. Last week's you never had a chance."

### Weekly challenge (smart, you pick)
Monday morning you get 3 challenges, chosen by code from your weakest ring or habit last week. Pick one (autonomy). Reward +6 Callus and a stamp in the trophy room.
| Key | Name | Goal | Offered when |
|---|---|---|---|
| early_kickoff | Early kickoff | 3 gym sessions started before 07:30 | Trained after 18:00 3+ times |
| protein_five | Protein five | Protein ring closed 5 of 7 days | Protein ring closed under 4 days |
| clean_week | Clean week | No day over budget by 10 %+ | 2+ days over |
| full_ninety | Full ninety | Log every day before 21:00 | 2+ logs after 22:00 |
| ten_k_minutes | Long legs | 150 walk or run minutes | Under 90 minutes last week |
| photo_day | Photo day | Take front, side, back progress photos | None in 14 days |
| weigh_in_three | Three weigh-ins | Weight logged 3 days | Under 2 weigh-ins |
| sleep_seven | Seven hours | 7+ hours sleep on 5 nights | Avg sleep under 6.5 h |
Each card shows why it was picked, in plain words: "Picked because you trained after 18:00 four times last week."

### Records
Best lift per exercise, best streak, lowest 7-day weight average, most sessions in a week. Shown as small tiles. New record = a nod (below).

### Answer back (the way home)
After a lost week or a missed day: "Answer back" appears. Log every day and do every planned session for 3 days. Done = half the Callus you lost comes back. "That's an answer." Fail = nothing extra lost.

## 4. Chapters
Promotion rules: PRODUCT.md. Promotion opens a full-screen chapter card, the one animated moment.
| Chapter | Story beat |
|---|---|
| Sunday League | "Muddy pitch. Nobody watching. Nobody expects anything. That's your advantage." |
| Academy | "Someone noticed. Now you train with people who wanted it first. Most will quit. Don't be most." |
| Reserves | "On the bench of a real team. I know your name now." |
| First Team | "Squad number. Your name on a shirt. Now the work has to be there every week." |
| Starter | "Ninety minutes, every week. Other people will notice the change before you do." |
| Captain | "The armband. Nobody gets it for talent. You get it for being there when it's cold and boring." |
| Champions League | "Bright lights. The work is the same as Sunday League. That's the secret." |
| Ballon d'Or | "A year. Every day accounted for. Look at your first photo." |
Dropped a chapter: "Back to {chapter}. You know the way up. You've walked it."

## 5. Trophies
Locked ones show name and a one-line hint, never a percentage.
| Trophy | Earned by | Line |
|---|---|---|
| First whistle | First log | "Day one. Most people never get a day two." |
| Seven straight | 7-day streak | "A week. Now it's a habit you can lose." |
| Beat yourself | First week won vs last week | "You beat the only rival who matters." |
| Hat-trick | 3 weeks in a row beating yourself | "Three straight. He's struggling to keep up." |
| Early riser | 10 gym sessions started before 08:00 | "Ten cold mornings. That's the real gym." |
| Answer back | Finish an Answer back | "Knocked down. Got up. That's the game." |
| Challenger | 5 weekly challenges done | "Five challenges. You pick hard ones." |
| First kilo | 7-day average 1 kg under start | "One kilo. Nobody noticed. You did." |
| Five kilos | 5 kg under start | "Five kilos. Look at the photos." |
| Waist down 5 | Waist 5 cm under first | "Belt needs a new hole." |
| Ten bests | 10 lift records | "Stronger than last month. Measurably." |
| Photo diary | 6 progress photos | "Proof you can see." |

## The nod (rare)
When something real happens (record, lowest average yet, perfect week), 1 in 3 chance the Gaffer sends one line. From facts only. Never two days running. Example: "81.2 kg. Lowest average yet. Noted."

## Today's line (daily card)
One card on Today, changes at midnight. Rules and the line bank: CONTENT.md > Today's line.

## Rules the game never breaks
- Never comments on looks. Only on actions.
- Never lies to motivate. Every number is real.
- Never punishes a logged rest day.
- One game message on Today at a time.
- Nothing resets to zero except the streak. Callus, chapters and trophies survive bad weeks.

# Domain handoff

All pure. Dates are 'YYYY-MM-DD' (Europe/Riga). Import game things from `@/features/game` (barrel). Run: `npx vitest run --coverage`.

## features/game
Types: `DayRecord {day, planned, sessionDone, logged, fuelClosed, proteinClosed}`, `WeekResult 'win'|'loss'|'draw'|'no_ghost'`, `Form {key, name}`.

- `scoreDay(input: DayScoreInput): DayScore` nightly scoring. Input: logged, loggedOnDay, session (SessionStatusT), eatenKcal, budgetKcal (with add-back), bmrKcal, proteinG, proteinTargetG, habitsDone, sick, weeklyPoints?, prev {callus, division, careerDays, streak, bestStreak, offFormDays}. Output: points, breakdown {logged, notLogged, session, fuel, overBudget, protein, habits, weekly}, callus, form, division, careerDays, streak, bestStreak, milestonesHit, offFormDays, promoted, dropped, previousDivision, sick, counted.
- `pointsForDay(input)` points and breakdown only. `previewDay(input)` live preview (unlogged shows 0). `clampCallus(n)`. `weeklyPoints(result 'win'|'loss'|'draw'|'none', challengeDone): number`.
- `formFor(callus): Form`, `formLineIndex(lineCount, dayNumber): number` rotates Gaffer lines.
- `applyDivision(state {division, careerDays, offFormDays}, callus): DivisionResult` (drop first, then one promotion). `divisionIndex`, `divisionMark`, `nextDivision`, `previousDivision`, `daysToNextDivision`, `nextDivisionBar`.
- `stepStreak(prev {streak, bestStreak}, {loggedOnDay, sick}): {streak, bestStreak, milestonesHit, broken}`, `nextMilestone(streak)`, `streakFromFlags(flags)`.
- `computeRings(RingsInput): Rings` (fuel/protein/train with progress, overflow, closed; hidden on sick). `sessionStatus(planned, done, dayEnded): SessionStatusT`.
- `compareWeeks({weekStart, through, thisWeek, lastWeek|null}): WeekComparison` rounds, scoreYou, scoreGhost, result, perfect, noGhost, final. `weekOutcomePoints(result)`, `winStreak(newestFirst)`, `longestWinRun(oldestFirst)`, `offerIntervals(newestFirst)`, `losingRoundHint(cmp): {round, n}|null`, `ghostShowedUpDay(...)`, `matchLine(cmp, ctx): MatchLine` (keys no_ghost, winning, losing_round, full_time_win, draw, loss, perfect, none; map to `matchLines` in content/copy.ts).
- `offerChallenges(LastWeekStats): ChallengeOffer[3]` ({key, triggered, count, why}), `triggeredChallenges(stats)`, `challengeProgress({key, weekStart, today, days: ChallengeDay[], photoPoses}): {current, goal, done, failed}`.
- Records: `bestLifts(sets)`, `countLiftRecords(sets)`, `lowestAverage(series)`, `mostSessionsInWeek(counts)`.
- `answerBackOffer({active, lastWeekResult, yesterday})`, `answerBackProgress({startDay, today, days})`, `callusLost(before, after)`, `answerBackReward(lost)`.
- `evaluateTrophies(TrophyInput): Record<TrophyKey, boolean>`, `newlyEarned(input, alreadyEarned): TrophyKey[]`, `TROPHY_KEYS`.
- `shouldNod({events, random, today, lastNodDay}): boolean`.
- Tunables: `features/game/config.ts`.

## features/nutrition
- `bmr(input)`, `computeTargets({sex, weightKg, heightCm, ageYears, goalWeightKg}): {bmrKcal, baseBurnKcal, budgetKcal, proteinG}`.
- `activityKcal(activity, minutes, weightKg, {fastRun?}): number` value for kcal_burned. `dayBudget(budget, burned)`, `needsRetarget(avgAtTargets, avgNow)`.
- `safetyKeys({weeklyChangePct[], recentEatenKcal[], bmrKcal, noteText?}): SafetyKey[]`, `safetyLine(key): string` (exact PRODUCT.md text).
- `adaptiveBudget({days, trendStartKg, trendEndKg, currentBudgetKcal, bmrKcal}): AdaptiveResult`, `adaptiveLine(result): string|null`, `groupThousands(n)`.
- `buildShoppingList(picks: {recipe, batches?}[]): {group, items}[]`, `picksNeeded(withThursday)`, `suggestRecipes(allIds, lastWeekIds, count)`.

## features/body
- `bmi`, `waistToHeight`, `waistToHeightOk`, `bodyFatNavy({sex, heightCm, waistCm, neckCm, hipsCm?}): number|null`.
- `trendAt(entries, day)`, `trendSeries(entries, from, to)`, `weeklyChangePct(now, weekAgo)`, `weeklyChangeAt(entries, day)`, `lossRateBand(pct)`.
- `projectGoalDate({entries, today, goalKg}): GoalProjection`, `goalLine(projection): string|null`.

## features/insights
- `computeFacts(FactInput): Fact[]`, `pickFact(facts, recentlyShownIds, nowHour): Fact|null`, `renderTemplate(fact): string`.
- `checkGrounding(text, values): boolean`, `groundingProblems(text, values|values[]): string[]`, `groundWeekly(text, valuesList): boolean`.

## features/training
- `nextProgression(rule {repMin, repMax, sets, bodyweight}, lastSets): ProgressionHint`, `isBetterSet`, `bestSet`, `isNewBest(history, candidate)`.

## Decisions
- Root `tsconfig.json` has a literal backtick-n on the "strict" line (invalid JSON). It breaks `tsc` and vitest's default tsconfig load. Lead should fix. Meanwhile `vitest.config.ts` points at `tests/unit/tsconfig.json`.
- Budget: 0.75 x 1.3 x BMR is below BMR, so the floor always applies and budget equals BMR (plus add-back). Spec followed literally; lead may want to review.
- Progression step is 2 kg (CONTENT.md), not 2.5 (PRODUCT.md).
- Career days count every non-sick day; a drop resets to the lower division mark; one promotion per day; drop is checked before promotion.
- Only logs created on the day count; backfilled days score as not logged.
- Fuel ring tolerance 0 (spec), Callus fuel point tolerance +5 percent.
- Weekly match counts today as given; `through` decides the compare point. Perfect ghost (all days or all planned sessions) matched counts as a win.
- Challenge filler cards when fewer than 3 trigger, with a neutral reason.
- Grounding is strict: spelled numbers from two up, clock times, weekday and month names must be in values; "one" and "may" are ignored.
- Added `features/body/config.ts` and `tests/unit/tsconfig.json`. Exclamation marks appear only as logical operators.
- Fact `weak_weekday` template says "{n} of the last 4" with n real; `stalled_trend` needs a weigh-in today-window.

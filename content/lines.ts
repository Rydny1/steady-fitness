// Today's line (daily card). Source of truth: CONTENT.md > Today's line.
// About 5 days a week: a Gaffer line. About 2 days a week: a real quote.
// On Off form days, pick from lines tagged 'comeback'. No line repeats within 30 days.
import { quotes, type Quote } from './quotes/quotes';

export type GafferLine = {
  id: string;
  text: string;
  comeback: boolean;
};

const raw: [string, boolean][] = [
  ['Nobody cares how you feel at 06:30. Get up anyway.', false],
  ['Motivation shows up late. Start without it.', false],
  ['The bed has never made anyone stronger.', false],
  ['Boring days build the body. Have one.', false],
  ["You don't need a perfect day. You need a logged one.", true],
  ["One meal doesn't ruin you. The next choice decides.", true],
  ["Rain is not a reason. It's weather.", false],
  ['Talent is a head start. Habits finish the race.', false],
  ["Last week's you set the bar. Go clear it.", false],
  ['The hard part is the first five minutes. Do those.', true],
  ['Tired is information, not an instruction.', false],
  ["You've done harder things than one more set.", false],
  ["Small promises, kept daily. That's the whole trick.", true],
  ['Nobody scores from the bench.', false],
  ["Eat like you're training for something. You are.", false],
  ['Protein first. Then argue with yourself.', false],
  ["The scale lies daily. The trend doesn't.", true],
  ['Comfort is a loan. You pay it back later.', false],
  ['Your body keeps the receipts.', false],
  ['Do it badly. Then do it again tomorrow.', true],
  ['Stretch now or limp later.', false],
  ["A missed day is a fact. Two is a pattern. Don't make three.", true],
  ["Thursday's ninety minutes start with Wednesday's sleep.", false],
  ['You beat last week by being boring on Tuesday.', false],
  ['Write the log. Ugly days count too.', true],
  ['Hungry at 22:00? Water, then bed. Breakfast will thank you.', false],
  ['Strong people get tired too. They just go anyway.', false],
  ["The plan is simple. That's why it's hard.", false],
  ["Today counts. That's the whole message.", true],
  ['Off form is a week, not a person.', true],
];

export const gafferLines: GafferLine[] = raw.map(([text, comeback], i) => ({
  id: `g${String(i + 1).padStart(2, '0')}`,
  text,
  comeback,
}));

export const comebackLines: GafferLine[] = gafferLines.filter((l) => l.comeback);

/** Real quotes (see quotes/quotes.ts). Each is 15 words or fewer and has a source link. */
export { quotes };
export type { Quote };

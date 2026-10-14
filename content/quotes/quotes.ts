// Real quotes for Today's line. Every entry is 15 words or fewer.
// Stoics: public-domain translations, text checked against the translation named in `work`.
// Athletes: Wikiquote "Quotes" entries that cite a primary source; sourceUrl points at that Wikiquote page,
// and `work` names the cited source. No song lyrics. Unverifiable quotes were dropped.

export type Quote = {
  id: string;
  text: string;
  author: string;
  /** Where the quote comes from, e.g. book and translator. */
  work: string;
  sourceUrl: string;
};

const MARCUS = 'https://www.gutenberg.org/ebooks/15877';
const EPICT = 'https://www.gutenberg.org/ebooks/45109';
const sen = (n: number) => `https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_${n}`;

const marcus = (book: string) => `Meditations, Book ${book} (George Long translation)`;
const epict = 'The Enchiridion (Thomas Wentworth Higginson translation)';
const seneca = (letter: string) => `Letters to Lucilius, Letter ${letter} (Richard M. Gummere translation)`;

export const quotes: Quote[] = [
  // Marcus Aurelius
  { id: 'q01', text: 'While thou livest, while it is in thy power, be good.', author: 'Marcus Aurelius', work: marcus('IV'), sourceUrl: MARCUS },
  { id: 'q02', text: 'Do not act as if thou wert going to live ten thousand years.', author: 'Marcus Aurelius', work: marcus('IV'), sourceUrl: MARCUS },
  { id: 'q03', text: 'Confine thyself to the present.', author: 'Marcus Aurelius', work: marcus('VII'), sourceUrl: MARCUS },
  { id: 'q04', text: 'Live as on a mountain.', author: 'Marcus Aurelius', work: marcus('X'), sourceUrl: MARCUS },
  { id: 'q05', text: 'Consider that everything is opinion, and opinion is in thy power.', author: 'Marcus Aurelius', work: marcus('XII'), sourceUrl: MARCUS },
  { id: 'q06', text: 'Remember that neither the future nor the past pains thee, but only the present.', author: 'Marcus Aurelius', work: marcus('VIII'), sourceUrl: MARCUS },
  { id: 'q07', text: 'It is satisfaction to a man to do the proper works of a man.', author: 'Marcus Aurelius', work: marcus('VIII'), sourceUrl: MARCUS },
  { id: 'q08', text: 'Give thyself time to learn something new and good, and cease to be whirled around.', author: 'Marcus Aurelius', work: marcus('II'), sourceUrl: MARCUS },
  { id: 'q09', text: 'Short is the little which remains to thee of life.', author: 'Marcus Aurelius', work: marcus('X'), sourceUrl: MARCUS },
  { id: 'q10', text: 'What good will this anger do thee?', author: 'Marcus Aurelius', work: marcus('V'), sourceUrl: MARCUS },
  { id: 'q11', text: 'Men exist for the sake of one another.', author: 'Marcus Aurelius', work: marcus('VIII'), sourceUrl: MARCUS },
  { id: 'q12', text: 'The universe is transformation: life is opinion.', author: 'Marcus Aurelius', work: marcus('IV'), sourceUrl: MARCUS },
  { id: 'q13', text: 'If a man is mistaken, instruct him kindly and show him his error.', author: 'Marcus Aurelius', work: marcus('X'), sourceUrl: MARCUS },
  { id: 'q14', text: 'Do not disturb thyself by thinking of the whole of thy life.', author: 'Marcus Aurelius', work: marcus('VIII'), sourceUrl: MARCUS },

  // Epictetus
  { id: 'q15', text: 'Exercise, therefore, what is in your power.', author: 'Epictetus', work: epict, sourceUrl: EPICT },
  { id: 'q16', text: 'You will then be hurt when you consent to be hurt.', author: 'Epictetus', work: epict, sourceUrl: EPICT },
  { id: 'q17', text: 'Be mostly silent, or speak merely what is needful, and in few words.', author: 'Epictetus', work: epict, sourceUrl: EPICT },
  { id: 'q18', text: 'You are no longer a boy but a grown man.', author: 'Epictetus', work: epict, sourceUrl: EPICT },
  { id: 'q19', text: 'Let whatever appears to be the best be to you an inviolable law.', author: 'Epictetus', work: epict, sourceUrl: EPICT },
  { id: 'q20', text: 'Be not elated at any excellence not your own.', author: 'Epictetus', work: epict, sourceUrl: EPICT },
  { id: 'q21', text: 'For if you once gain time and respite, you will more easily command yourself.', author: 'Epictetus', work: epict, sourceUrl: EPICT },
  { id: 'q22', text: 'Try, therefore, in the first place, not to be bewildered by appearances.', author: 'Epictetus', work: epict, sourceUrl: EPICT },
  { id: 'q23', text: 'It is enough if everyone fully performs his own proper business.', author: 'Epictetus', work: epict, sourceUrl: EPICT },

  // Seneca
  { id: 'q24', text: 'While we are postponing, life speeds by.', author: 'Seneca', work: seneca('I'), sourceUrl: sen(1) },
  { id: 'q25', text: 'A great pilot can sail even when his canvas is rent.', author: 'Seneca', work: seneca('XXX'), sourceUrl: sen(30) },
  { id: 'q26', text: 'Treat your inferiors as you would be treated by your betters.', author: 'Seneca', work: seneca('XLVII'), sourceUrl: sen(47) },
  { id: 'q27', text: 'As long as you live, keep learning how to live.', author: 'Seneca', work: seneca('LXXVI'), sourceUrl: sen(76) },
  { id: 'q28', text: 'For sometimes it is an act of bravery even to live.', author: 'Seneca', work: seneca('LXXVIII'), sourceUrl: sen(78) },
  { id: 'q29', text: 'It is a rough road that leads to the heights of greatness.', author: 'Seneca', work: seneca('LXXXIV'), sourceUrl: sen(84) },
  { id: 'q30', text: 'For no man is free who is a slave to his body.', author: 'Seneca', work: seneca('XCII'), sourceUrl: sen(92) },
  { id: 'q31', text: 'And yet life, Lucilius, is really a battle.', author: 'Seneca', work: seneca('XCVI'), sourceUrl: sen(96) },

  // Athletes and coaches (Wikiquote entries with a cited primary source)
  { id: 'q32', text: 'Limits, like fears, are often just an illusion.', author: 'Michael Jordan', work: 'Hall of Fame induction address, 2009', sourceUrl: 'https://en.wikiquote.org/wiki/Michael_Jordan' },
  { id: 'q33', text: 'I approached everything step by step.', author: 'Michael Jordan', work: 'How to be like Mike (2005)', sourceUrl: 'https://en.wikiquote.org/wiki/Michael_Jordan' },
  { id: 'q34', text: "But I can't accept not trying.", author: 'Michael Jordan', work: "I Can't Accept Not Trying (1994)", sourceUrl: 'https://en.wikiquote.org/wiki/Michael_Jordan' },
  { id: 'q35', text: 'Suffer now, and live the rest of your life as a champion.', author: 'Muhammad Ali', work: 'Newsweek, 25 September 1978', sourceUrl: 'https://en.wikiquote.org/wiki/Muhammad_Ali' },
  { id: 'q36', text: 'Age is whatever you think it is.', author: 'Muhammad Ali', work: 'Jet magazine, August 1992', sourceUrl: 'https://en.wikiquote.org/wiki/Muhammad_Ali' },
  { id: 'q37', text: 'Make at least one definite move daily toward your goal.', author: 'Bruce Lee', work: 'Tao of Jeet Kune Do (1975)', sourceUrl: 'https://en.wikiquote.org/wiki/Bruce_Lee' },
  { id: 'q38', text: "Boards don't hit back.", author: 'Bruce Lee', work: 'Enter the Dragon (1973)', sourceUrl: 'https://en.wikiquote.org/wiki/Bruce_Lee' },
  { id: 'q39', text: "Just remember, you can't climb the ladder of success with your hands in your pockets.", author: 'Arnold Schwarzenegger', work: 'University of Southern California commencement speech, 2009', sourceUrl: 'https://en.wikiquote.org/wiki/Arnold_Schwarzenegger' },
];

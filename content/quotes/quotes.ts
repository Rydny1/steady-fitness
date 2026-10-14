// Verified quotes for Today's daily quote card. Every text is 19 words or fewer, no exclamation marks, no long dashes.
// Each entry was checked against the source in `work` / `sourceUrl` (see CREDITS.md for the per-quote verification note):
//  - Stoics: public-domain translations (Long, Higginson, Gummere), text matched on Project Gutenberg / Wikisource.
//  - Confucius and Lao Tzu: James Legge translations (Gutenberg #3330, Wikisource "Tao Teh King").
//  - Jobs, Clear, Roosevelt, Gregorek, Willink: the person's own speech, site, book or the show page quoting them.
//  - Athletes: Wikiquote entries listed under "Quotes" with a cited primary source (no "Misattributed" or "Disputed").
// `comeback: true` marks the gentler, more forgiving lines used on low-form days.

export type Quote = {
  id: string;
  text: string;
  author: string;
  /** Where the quote comes from, e.g. book and translator. */
  work: string;
  sourceUrl: string;
  /** Gentler, forgiving line suitable for a low-form day. */
  comeback?: boolean;
};

const MARCUS = 'https://www.gutenberg.org/ebooks/15877';
const EPICT = 'https://www.gutenberg.org/ebooks/45109';
const sen = (n: number): string => `https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_${n}`;
const LEGGE_ANALECTS = 'https://www.gutenberg.org/ebooks/3330';
const LEGGE_TAO = 'https://en.wikisource.org/wiki/T%C3%A2o_Teh_King';
const JOBS = 'https://news.stanford.edu/stories/2005/06/youve-got-find-love-jobs-says';
const CLEAR_SUMMARY = 'https://jamesclear.com/atomic-habits-summary';
const wq = (page: string): string => `https://en.wikiquote.org/wiki/${page}`;

const marcus = (book: string): string => `Meditations, Book ${book} (George Long translation)`;
const epict = 'The Enchiridion (Thomas Wentworth Higginson translation)';
const seneca = (letter: string): string => `Letters to Lucilius, Letter ${letter} (Richard M. Gummere translation)`;
const analects = 'The Analects (James Legge translation)';
const tao = 'Tao Te Ching (James Legge translation)';

const mk = (
  id: string,
  text: string,
  author: string,
  work: string,
  sourceUrl: string,
  comeback?: boolean,
): Quote => (comeback ? { id, text, author, work, sourceUrl, comeback: true } : { id, text, author, work, sourceUrl });

export const quotes: Quote[] = [
  // Marcus Aurelius
  mk('q01', "While thou livest, while it is in thy power, be good.", 'Marcus Aurelius', marcus('IV'), MARCUS),
  mk('q02', "Do not act as if thou wert going to live ten thousand years.", 'Marcus Aurelius', marcus('IV'), MARCUS),
  mk('q03', "Confine thyself to the present.", 'Marcus Aurelius', marcus('VII'), MARCUS, true),
  mk('q04', "Consider that everything is opinion, and opinion is in thy power.", 'Marcus Aurelius', marcus('XII'), MARCUS),
  mk('q05', "Give thyself time to learn something new and good, and cease to be whirled around.", 'Marcus Aurelius', marcus('II'), MARCUS, true),
  mk('q06', "Remember that neither the future nor the past pains thee, but only the present.", 'Marcus Aurelius', marcus('VIII'), MARCUS, true),
  mk('q07', "That which is an obstacle on the road helps us on this road.", 'Marcus Aurelius', marcus('V'), MARCUS),
  mk('q08', "I am rising to the work of a human being.", 'Marcus Aurelius', marcus('V'), MARCUS, true),

  // Epictetus
  mk('q09', "Exercise, therefore, what is in your power.", 'Epictetus', epict, EPICT),
  mk('q10', "You will then be hurt when you consent to be hurt.", 'Epictetus', epict, EPICT),
  mk('q11', "Let whatever appears to be the best be to you an inviolable law.", 'Epictetus', epict, EPICT),
  mk('q12', "For if you once gain time and respite, you will more easily command yourself.", 'Epictetus', epict, EPICT, true),
  mk('q13', "Try, therefore, in the first place, not to be bewildered by appearances.", 'Epictetus', epict, EPICT),
  mk('q14', "It is difficulties that show what men are.", 'Epictetus', 'Discourses, 1.24.1', wq('Epictetus')),
  mk('q15', "Practice yourself, for heaven's sake, in little things; and thence proceed to greater.", 'Epictetus', 'Discourses, 1.18.18', wq('Epictetus'), true),
  mk('q16', "Know, first, who you are, and then adorn yourself accordingly.", 'Epictetus', 'Discourses, 3.1.24', wq('Epictetus')),

  // Seneca
  mk('q17', "While we are postponing, life speeds by.", 'Seneca', seneca('I'), sen(1)),
  mk('q18', "Hold every hour in your grasp.", 'Seneca', seneca('I'), sen(1)),
  mk('q19', "We suffer more often in imagination than in reality.", 'Seneca', seneca('XIII'), sen(13), true),
  mk('q20', "A great pilot can sail even when his canvas is rent.", 'Seneca', seneca('XXX'), sen(30)),
  mk('q21', "As long as you live, keep learning how to live.", 'Seneca', seneca('LXXVI'), sen(76), true),
  mk('q22', "For sometimes it is an act of bravery even to live.", 'Seneca', seneca('LXXVIII'), sen(78)),
  mk('q23', "It is a rough road that leads to the heights of greatness.", 'Seneca', seneca('LXXXIV'), sen(84)),
  mk('q24', "For no man is free who is a slave to his body.", 'Seneca', seneca('XCII'), sen(92)),

  // Confucius
  mk('q25', "The cautious seldom err.", 'Confucius', analects, LEGGE_ANALECTS),
  mk('q26', "The superior man is modest in his speech, but exceeds in his actions.", 'Confucius', analects, LEGGE_ANALECTS),
  mk('q27', "Virtue is not left to stand alone. He who practises it will have neighbors.", 'Confucius', analects, LEGGE_ANALECTS),
  mk('q28', "When you have faults, do not fear to abandon them.", 'Confucius', analects, LEGGE_ANALECTS, true),
  mk('q29', "To see what is right and not to do it is want of courage.", 'Confucius', analects, LEGGE_ANALECTS),
  mk('q30', "I am not concerned that I am not known, I seek to be worthy to be known.", 'Confucius', analects, LEGGE_ANALECTS, true),
  mk('q31', "Learning without thought is labour lost; thought without learning is perilous.", 'Confucius', analects, LEGGE_ANALECTS),

  // Lao Tzu
  mk('q32', "The journey of a thousand li commenced with a single step.", 'Lao Tzu', tao, LEGGE_TAO, true),
  mk('q33', "He who overcomes others is strong; he who overcomes himself is mighty.", 'Lao Tzu', tao, LEGGE_TAO, true),
  mk('q34', "He who knows other men is discerning; he who knows himself is intelligent.", 'Lao Tzu', tao, LEGGE_TAO),
  mk('q35', "He who is satisfied with his lot is rich.", 'Lao Tzu', tao, LEGGE_TAO),

  // Steve Jobs
  mk('q36', "And the only way to do great work is to love what you do.", 'Steve Jobs', 'Stanford commencement address, 12 June 2005', JOBS),
  mk('q37', "Your time is limited, so don't waste it living someone else's life.", 'Steve Jobs', 'Stanford commencement address, 12 June 2005', JOBS),
  mk('q38', "Sometimes life's gonna hit you in the head with a brick. Don't lose faith.", 'Steve Jobs', 'Stanford commencement address, 12 June 2005', JOBS, true),
  mk('q39', "So keep looking. Don't settle.", 'Steve Jobs', 'Stanford commencement address, 12 June 2005', JOBS, true),
  mk('q40', "And most important, have the courage to follow your heart and intuition.", 'Steve Jobs', 'Stanford commencement address, 12 June 2005', JOBS),

  // James Clear
  mk('q41', "Winners and losers have the same goals.", 'James Clear', 'Atomic Habits, as published on jamesclear.com (Goals vs. Systems)', 'https://jamesclear.com/goals-systems'),
  mk('q42', "You do not rise to the level of your goals. You fall to the level of your systems.", 'James Clear', 'Atomic Habits', CLEAR_SUMMARY),
  mk('q43', "Every action you take is a vote for the type of person you wish to become.", 'James Clear', 'Atomic Habits, p. 38', CLEAR_SUMMARY, true),
  mk('q44', "All big things come from small beginnings.", 'James Clear', 'Atomic Habits, p. 22', CLEAR_SUMMARY, true),
  mk('q45', "The seed of every habit is a single, tiny decision.", 'James Clear', 'Atomic Habits, p. 22', CLEAR_SUMMARY, true),

  // Jocko Willink, Jerzy Gregorek
  mk('q46', "Discipline equals freedom.", 'Jocko Willink', 'Discipline Equals Freedom: Field Manual (2017), book title', 'https://jockowillink.com/'),
  mk('q47', "Hard choices, easy life. Easy choices, hard life.", 'Jerzy Gregorek', 'The Tim Ferriss Show, episode 228 (2017)', 'https://tim.blog/2017/03/16/jerzy-gregorek/'),

  // Bruce Lee
  mk('q48', "Make at least one definite move daily toward your goal.", 'Bruce Lee', 'Jeet Kune Do, Part 6 (1997)', wq('Bruce_Lee'), true),
  mk('q49', "Running water never grows stale. So you just have to 'keep on flowing.'", 'Bruce Lee', 'The Warrior Within, p. 48', wq('Bruce_Lee'), true),
  mk('q50', "Life itself is your teacher, and you are in a state of constant learning.", 'Bruce Lee', 'Striking Thoughts, p. 5', wq('Bruce_Lee'), true),
  mk('q51', "A goal is not always meant to be reached, it often serves simply as something to aim at.", 'Bruce Lee', 'Striking Thoughts, p. 121', wq('Bruce_Lee')),
  mk('q52', "Research your own experience; absorb what is useful, reject what is useless and add what is essentially your own.", 'Bruce Lee', 'Striking Thoughts, p. 176', wq('Bruce_Lee')),

  // Muhammad Ali
  mk('q53', "Suffer now, and live the rest of your life as a champion.", 'Muhammad Ali', 'Newsweek, 25 September 1978', wq('Muhammad_Ali')),
  mk('q54', "Age is whatever you think it is.", 'Muhammad Ali', 'Jet magazine, August 1992', wq('Muhammad_Ali')),
  mk('q55', "It's a lack of faith that makes people afraid of meeting challenges, and I believe in myself.", 'Muhammad Ali', '101 Best Ways to Get Ahead (2004), p. 59', wq('Muhammad_Ali')),

  // Michael Jordan
  mk('q56', "Limits, like fears, are often just an illusion.", 'Michael Jordan', 'Hall of Fame induction address, 2009', wq('Michael_Jordan')),
  mk('q57', "I approached everything step by step.", 'Michael Jordan', 'How to be like Mike (2005)', wq('Michael_Jordan'), true),
  mk('q58', "But I can't accept not trying.", 'Michael Jordan', "I Can't Accept Not Trying (1994)", wq('Michael_Jordan'), true),

  // Arnold Schwarzenegger
  mk('q59', "Just remember, you can't climb the ladder of success with your hands in your pockets.", 'Arnold Schwarzenegger', 'University of Southern California commencement speech, 2009', wq('Arnold_Schwarzenegger')),
  mk('q60', "Never complain if you don't have a better solution.", 'Arnold Schwarzenegger', 'Interview with Guenther Ziesel, 2017', wq('Arnold_Schwarzenegger')),

  // Theodore Roosevelt, Eliud Kipchoge
  mk('q61', "By acting as if I was not afraid I gradually ceased to be afraid.", 'Theodore Roosevelt', 'An Autobiography (1913), Chapter II', 'https://www.bartleby.com/55/2.html', true),
  mk('q62', "Only the disciplined ones are free in life.", 'Eliud Kipchoge', 'Oxford Union address, 5 January 2018', wq('Eliud_Kipchoge')),
  mk('q63', "100 percent of me is nothing compared to one percent of the whole team.", 'Eliud Kipchoge', 'Daily Nation, 27 August 2019', wq('Eliud_Kipchoge')),
  mk('q64', "Resilience is one of the recipes for success.", 'Eliud Kipchoge', 'Boston Marathon interview, April 2023', wq('Eliud_Kipchoge'), true),
];

/** Gentler, forgiving subset used on low-form days. */
export const comebackQuotes: Quote[] = quotes.filter((q) => q.comeback === true);

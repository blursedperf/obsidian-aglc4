/**
 * Paragraph prompts: short, faint reminders of what each part of a legal essay or problem answer should
 * do, shown in the editor at an empty paragraph. They are guidance on structure, never content, and are
 * never written into the note.
 *
 * The built-in sets are written from the advice of Australian law schools' writing guides:
 * - Southern Cross University, "IRAC: Structuring legal analysis" (Learning Zone quick guide): IRAC, ILAC;
 * - Monash University Library, "Legal problem solving" (issue, rule, application, conclusion; MIRAT);
 * - ANU Academic Skills, "Writing in Law": HIRAC, and legal essays;
 * - UTS Faculty of Law, "Guide to Written Communication" (2023): introductions, paragraphs, conclusions,
 *   critical analysis, "discuss", and problem questions;
 * - Tudor and Falconer, "A Guide to Writing for Law School" (La Trobe University, CAUL open textbook).
 * Law schools differ, and lecturers' instructions come first: every set can be copied and edited as a
 * custom set.
 */

export type PromptKind = 'essay' | 'problem';

export interface PromptSection {
	/** The section's name, used as its heading in a new essay. */
	name: string;
	/** Other headings that mean the same section (lower case). */
	aliases: string[];
	/** Prompts for the first, second, … empty paragraph in the section; the last repeats. */
	prompts: string[];
	/** Not part of a new essay's outline (eg an optional overview). */
	optional?: boolean;
	/** For a problem answer: the section belongs to each issue, not to the answer as a whole. */
	perIssue?: boolean;
}

export interface PromptSet {
	id: string;
	name: string;
	kind: PromptKind;
	/** One line, shown when choosing a set. */
	description: string;
	sections: PromptSection[];
	/**
	 * Prompts for paragraphs under a heading that matches no section: in an essay, its body; in a problem
	 * answer, an issue written without sub-headings (its paragraphs follow the issue's sections in order).
	 */
	body: string[];
	/** Prompt for an issue's own heading in a problem answer, if any (HIRAC). */
	issueHeading?: string;
	/** Where the advice comes from. */
	sources: string[];
	/** True for a set defined in a note. */
	custom?: boolean;
	/** For a custom set: the note that defines it. */
	path?: string;
}

const SCU = 'Southern Cross University, "IRAC: Structuring legal analysis"';
const MONASH = 'Monash University Library, "Legal problem solving"';
const ANU = 'ANU Academic Skills, "Writing in Law"';
const UTS = 'UTS Faculty of Law, "Guide to Written Communication" (2023)';
const LATROBE = 'Tudor and Falconer, "A Guide to Writing for Law School"';

const overview: PromptSection = {
	name: 'Overview',
	aliases: ['overview', 'introduction', 'summary of issues', 'issues'],
	prompts: [
		'Overview: identify the parties and list the legal issues you will address, in a logical order (liability before remedies).',
	],
	optional: true,
};

const issue: PromptSection = {
	name: 'Issue',
	aliases: ['issue', 'the issue', 'legal issue', 'question'],
	prompts: [
		'Issue: frame it as a specific legal question for this party, eg "Is X liable in negligence for Y\'s injury?", not "Will the plaintiff win?".',
		'Break the issue into sub-issues (one for each element) if it has several: each gets its own rule, application and conclusion.',
	],
	perIssue: true,
};

const rule = (name: string): PromptSection => ({
	name,
	aliases: ['rule', 'rules', 'law', 'the law', 'relevant law', 'legal rules', 'legal principles'],
	prompts: [
		`${name}: state the rule as a general principle, without the parties' facts, with its source: the Act and section, or the case, cited in AGLC4.`,
		'Set out the elements or test the rule requires: each element is a sub-issue to apply to the facts.',
		'Add any qualification, exception or defence, with its authority.',
	],
	perIssue: true,
});

const application: PromptSection = {
	name: 'Application',
	aliases: ['application', 'apply', 'analysis', 'applying the law'],
	prompts: [
		'Apply each element of the rule to the material facts: "Here, …", "In this case, …".',
		'Compare the facts with the cases: follow ("Similar to …") or distinguish ("Unlike …") them, and say why.',
		'Consider the other party\'s best argument, and how strong it is.',
		'End the paragraph with the point it establishes for this issue.',
	],
	perIssue: true,
};

const conclusion: PromptSection = {
	name: 'Conclusion',
	aliases: ['conclusion', 'conclusions', 'outcome', 'likely outcome'],
	prompts: [
		'Conclusion: state the likely outcome on this issue and the reason for it ("X will likely …"); do not claim certainty.',
	],
	perIssue: true,
};

const overall: PromptSection = {
	name: 'Overall conclusion',
	aliases: ['overall conclusion', 'advice', 'summary of advice', 'final conclusion', 'recommendation', 'recommendations'],
	prompts: [
		'Bring the issues together: the client\'s overall position, any remedy, and your advice.',
	],
};

const problemBody = [
	'Issue: the specific legal question this issue raises, for this party.',
	'Rule: the governing principle and its authority (Act and section, or case), cited in AGLC4.',
	'Application: apply each element to the facts; follow or distinguish the cases; consider the other side.',
	'Application: the next element, or the other party\'s argument and how strong it is.',
	'Conclusion: the likely outcome on this issue, and why.',
];

export const IRAC: PromptSet = {
	id: 'irac',
	name: 'Problem question: IRAC',
	kind: 'problem',
	description: 'Issue, Rule, Application, Conclusion, for each issue.',
	sections: [overview, issue, rule('Rule'), application, conclusion, overall],
	body: problemBody,
	sources: [SCU, MONASH, UTS],
};

export const ILAC: PromptSet = {
	...IRAC,
	id: 'ilac',
	name: 'Problem question: ILAC',
	description: 'Issue, Law, Application, Conclusion: IRAC with "Law" for "Rule".',
	sections: [overview, issue, rule('Law'), application, conclusion, overall],
	body: problemBody.map((p) => p.replace(/^Rule:/, 'Law:')),
	sources: [SCU],
};

export const HIRAC: PromptSet = {
	...IRAC,
	id: 'hirac',
	name: 'Problem question: HIRAC',
	description: 'A Heading for each issue, then Issue, Rule, Application, Conclusion.',
	issueHeading: 'Heading: sum up the issue as a short question, eg "Was there a valid acceptance?".',
	sources: [ANU],
};

export const MIRAT: PromptSet = {
	id: 'mirat',
	name: 'Problem question: MIRAT',
	kind: 'problem',
	description: 'Material facts, Issues, Rules, Arguments, Tentative conclusion.',
	sections: [
		{
			name: 'Material facts',
			aliases: ['material facts', 'facts', 'the facts'],
			prompts: [
				'Material facts: who, what, when, where and how. Separate the relevant facts from those that are not (yet).',
				'Note facts that are unclear or missing, and the assumptions you make about them.',
			],
		},
		{ ...issue, name: 'Issues', aliases: [...issue.aliases, 'issues'] },
		{
			...rule('Rules'),
			aliases: [...rule('Rules').aliases, 'resources', 'rules and resources'],
		},
		{
			name: 'Arguments',
			aliases: ['arguments', 'argument', 'application', 'analysis'],
			prompts: [
				'Arguments: apply the rules to the facts, setting out each party\'s argument.',
				'Follow or distinguish the cases on their facts, and weigh how strong each argument is.',
			],
			perIssue: true,
		},
		{
			name: 'Tentative conclusion',
			aliases: ['tentative conclusion', 'conclusion', 'conclusions'],
			prompts: [
				'Tentative conclusion: the most likely outcome, and the facts that could change it.',
			],
			perIssue: true,
		},
		overall,
	],
	body: [
		'Issue: the specific legal question this issue raises.',
		'Rules: the governing rules and their sources, cited in AGLC4.',
		'Arguments: each party\'s argument on the rules applied to the facts, and how strong it is.',
		'Tentative conclusion: the most likely outcome, and what could change it.',
	],
	sources: [MONASH],
};

const essayIntroduction = (first: string): PromptSection => ({
	name: 'Introduction',
	aliases: ['introduction', 'intro'],
	prompts: [
		first,
		'Outline the main points you will make, in the order you will make them (usually the strongest first), so the reader can follow the argument.',
		'Define key terms, and set the scope: which jurisdiction, and the law as it is or as it should be.',
	],
});

const essayConclusion = (first: string): PromptSection => ({
	name: 'Conclusion',
	aliases: ['conclusion', 'conclusions', 'concluding remarks'],
	prompts: [
		first,
		'Make sure the conclusion matches what the introduction promised. Add no new arguments or authorities.',
	],
});

export const CRITICAL: PromptSet = {
	id: 'critical',
	name: 'Essay: critical analysis',
	kind: 'essay',
	description: 'Take a position and argue it: thesis, supported points, counter-arguments, conclusion.',
	sections: [
		essayIntroduction('Introduction: identify the issue the question raises, and state your position on it (your thesis) in one or two sentences.'),
		{
			name: 'Counter-arguments',
			aliases: ['counter-arguments', 'counterarguments', 'counter-argument', 'counterargument', 'objections', 'criticisms', 'the other view'],
			prompts: [
				'Counter-argument: the strongest view against your thesis, fairly put, with its authority.',
				'Respond to it: why your position still holds, or what it concedes.',
			],
		},
		essayConclusion('Conclusion: restate your thesis in the light of your analysis, and sum up the main arguments.'),
	],
	body: [
		'Topic sentence: the point this paragraph makes for your thesis.',
		'Support the point with authority (legislation, cases, then commentary), cited in AGLC4.',
		'Analyse, don\'t describe: why does this authority support your point, and what are its limits?',
		'Link the paragraph back to your thesis, and lead into the next point.',
	],
	sources: [UTS, ANU, LATROBE],
};

export const DISCUSS: PromptSet = {
	id: 'discuss',
	name: 'Essay: "discuss" question',
	kind: 'essay',
	description: 'Look at both sides, weigh the arguments and reach a conclusion that answers the question.',
	sections: [
		essayIntroduction('Introduction: work out what "discuss" asks here (explain, analyse, evaluate or argue), and state the issue and where you will come down.'),
		{
			name: 'Evaluation',
			aliases: ['evaluation', 'evaluating the arguments', 'weighing the arguments', 'assessment', 'discussion'],
			prompts: [
				'Weigh the two sides: which arguments are more persuasive, and why?',
				'Say where the weight of authority lies, and where the law is unsettled.',
			],
		},
		essayConclusion('Conclusion: answer the question as asked: where does the weight of argument lie?'),
	],
	body: [
		'Topic sentence: one side of the question, or one aspect of it.',
		'Support it with authority (legislation, cases, then commentary), cited in AGLC4.',
		'Now the other side: the strongest arguments and authority against.',
		'Link the paragraph back to the question.',
	],
	sources: [UTS, LATROBE, ANU],
};

export const BUILT_IN_SETS: PromptSet[] = [IRAC, ILAC, HIRAC, MIRAT, CRITICAL, DISCUSS];

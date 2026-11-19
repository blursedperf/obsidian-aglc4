/**
 * Paragraph prompts: a guide to what each paragraph of a legal essay or problem answer should do, and
 * how its sentences can be built, shown in the editor above the paragraph being written. They are
 * guidance on structure, never content, and are never written into the note.
 *
 * The built-in sets are written from the advice of Australian law schools' writing guides:
 * - Southern Cross University, "IRAC: Structuring legal analysis" (Learning Zone quick guide): IRAC, ILAC;
 * - Monash University Library, "Legal problem solving" (issue, rule, application, conclusion; MIRAT);
 * - ANU Academic Skills, "Writing in Law": HIRAC, and legal essays;
 * - UTS Faculty of Law, "Guide to Written Communication" (2023): introductions, paragraphs (topic and
 *   concluding sentences, one point per paragraph), conclusions, critical analysis, "discuss", and
 *   problem questions;
 * - Tudor and Falconer, "A Guide to Writing for Law School" (La Trobe University, CAUL open textbook).
 * Law schools differ, and lecturers' instructions come first: every set can be copied and edited as a
 * custom set.
 */

export type PromptKind = 'essay' | 'problem';

/** The guide for one paragraph. */
export interface Prompt {
	/** What the paragraph does, eg "Rule: the governing principle and its source". */
	aim: string;
	/** Its sentences, in order, each "Role: what it says", eg "Authority: the Act and section …". */
	sentences: string[];
}

export interface PromptSection {
	/** The section's name, used as its heading in a new essay. */
	name: string;
	/** Other headings that mean the same section (lower case). */
	aliases: string[];
	/** Guides for the first, second, … paragraph in the section; the last repeats. */
	prompts: Prompt[];
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
	 * Guides for paragraphs under a heading that matches no section (the last repeats): in an essay, the
	 * paragraphs of one of its parts; in a problem answer, an issue written without sub-headings.
	 */
	body: Prompt[];
	/** Guide for an issue's own heading in a problem answer, if any (HIRAC). */
	issueHeading?: Prompt;
	/** Where the advice comes from. */
	sources: string[];
	/** True for a set defined in a note. */
	custom?: boolean;
	/** For a custom set: the note that defines it. */
	path?: string;
}

const p = (aim: string, ...sentences: string[]): Prompt => ({ aim, sentences });

const SCU = 'Southern Cross University, "IRAC: Structuring legal analysis"';
const MONASH = 'Monash University Library, "Legal problem solving"';
const ANU = 'ANU Academic Skills, "Writing in Law"';
const UTS = 'UTS Faculty of Law, "Guide to Written Communication" (2023)';
const LATROBE = 'Tudor and Falconer, "A Guide to Writing for Law School"';

// Problem questions

const overview: PromptSection = {
	name: 'Overview',
	aliases: ['overview', 'introduction', 'summary of issues', 'issues'],
	prompts: [
		p('Overview: who you are advising, and the issues, in order',
			'Client: who you are advising and what they want to know ("X seeks advice on whether …").',
			'Issues: the legal issues the facts raise, in the order you will deal with them (liability before remedies; each party in turn).',
			'Answer in brief (optional): your overall conclusion, in one sentence.'),
	],
	optional: true,
};

const issueQuestion = p('Issue: the legal question this issue raises',
	'Facts: the key facts that raise the issue ("X agreed to …, but then …").',
	'Question: the issue as a specific legal question for this party ("The issue is whether X is liable in negligence for Y\'s injury"), not "Will the plaintiff win?".',
	'Area of law: the cause of action, offence or doctrine it falls under, if not obvious.');

const issue: PromptSection = {
	name: 'Issue',
	aliases: ['issue', 'the issue', 'legal issue', 'question'],
	prompts: [
		issueQuestion,
		p('Issue: its sub-issues',
			'Elements: what the issue turns on ("To succeed, Y must establish …").',
			'Contested: which elements are clearly met (deal with them briefly) and which are in dispute (each gets its own rule, application and conclusion).'),
	],
	perIssue: true,
};

const rulePrompts = (name: string): Prompt[] => [
	p(`${name}: the governing principle and its source`,
		`${name}: the principle in general terms, without the parties' names or facts ("A promise is enforceable only if …").`,
		'Authority: its source, the Act and section or the leading case, cited in AGLC4 in a footnote.',
		'Elements: the elements or test it sets out, in the order you will apply them.'),
	p(`${name}: how the courts apply it`,
		'Interpretation: how the courts have read or applied the principle ("In [case], the High Court held that …").',
		'Closest case: the facts and outcome of the case most like this problem, to compare in the application.'),
	p(`${name}: exceptions, defences and limits`,
		'Qualification: any exception, defence or limit, with its authority.',
		'Burden: who must prove it, and to what standard, if it matters.'),
];

const rule = (name: string): PromptSection => ({
	name,
	aliases: ['rule', 'rules', 'law', 'the law', 'relevant law', 'legal rules', 'legal principles'],
	prompts: rulePrompts(name),
	perIssue: true,
});

const applyFacts = [
	'Facts: the facts that bear on it ("Here, X …", "In this case, …").',
	'Comparison: follow or distinguish the closest case ("As in …", "Unlike …") and say why the similarity or difference matters.',
	'Reasoning: why the facts satisfy, or fail, the element.',
	'Mini-conclusion: what this establishes ("It is therefore likely that …").',
];

const applyElement = p('Application: one element applied to the facts',
	'Topic sentence: the element this paragraph deals with ("The first question is whether …").',
	...applyFacts);

const applyNext = p('Application: the next element',
	'Topic sentence: the next element, linked to the last ("Having established …, the next question is whether …").',
	...applyFacts);

const applyOtherSide = p('Application: the other side',
	'Counter-argument: the other party\'s best argument on this point ("X may argue that …").',
	'Support: the facts or authority it relies on.',
	'Response: why it is weaker (or stronger) than your argument, with facts or authority.',
	'Weight: how likely it is to succeed: strong, arguable or weak.');

const application: PromptSection = {
	name: 'Application',
	aliases: ['application', 'apply', 'analysis', 'applying the law'],
	prompts: [applyElement, applyNext, applyOtherSide],
	perIssue: true,
};

const issueConclusion = p('Conclusion: the likely outcome on this issue',
	'Answer: answer the issue\'s question directly ("X is likely to be liable for …").',
	'Reason: the decisive reason, in a sentence, from your application.',
	'Uncertainty: what could change the outcome (a disputed fact, an unsettled point of law); do not claim certainty.',
	'Next: what follows, if anything: a remedy, or the next issue.');

const conclusion: PromptSection = {
	name: 'Conclusion',
	aliases: ['conclusion', 'conclusions', 'outcome', 'likely outcome'],
	prompts: [issueConclusion],
	perIssue: true,
};

const overall: PromptSection = {
	name: 'Overall conclusion',
	aliases: ['overall conclusion', 'advice', 'summary of advice', 'final conclusion', 'recommendation', 'recommendations'],
	prompts: [
		p('Overall conclusion: the advice',
			'Position: the client\'s overall position across the issues ("Overall, X is likely to …").',
			'Remedies: the remedies, orders or penalties likely to follow.',
			'Advice: practical next steps: evidence to gather, risks, or options such as settlement.'),
	],
};

/** An issue written under one heading, without sub-headings: IRAC in order. */
const problemBody = (ruleName: string): Prompt[] => [issueQuestion, rulePrompts(ruleName)[0]!, applyElement, applyOtherSide, issueConclusion];

export const IRAC: PromptSet = {
	id: 'irac',
	name: 'Problem question: IRAC',
	kind: 'problem',
	description: 'Issue, Rule, Application, Conclusion, for each issue.',
	sections: [overview, issue, rule('Rule'), application, conclusion, overall],
	body: problemBody('Rule'),
	sources: [SCU, MONASH, UTS],
};

export const ILAC: PromptSet = {
	...IRAC,
	id: 'ilac',
	name: 'Problem question: ILAC',
	description: 'Issue, Law, Application, Conclusion: IRAC with "Law" for "Rule".',
	sections: [overview, issue, rule('Law'), application, conclusion, overall],
	body: problemBody('Law'),
	sources: [SCU],
};

export const HIRAC: PromptSet = {
	...IRAC,
	id: 'hirac',
	name: 'Problem question: HIRAC',
	description: 'A Heading for each issue, then Issue, Rule, Application, Conclusion.',
	issueHeading: p('Heading: the issue in a few words',
		'Heading: sum up the issue as a short question, eg "Was there a valid acceptance?" or "Is the employer vicariously liable?".'),
	sources: [ANU],
};

const miratFor = p('Arguments: the case for one party',
	'Topic sentence: the argument this party would make on the element ("Y will argue that …").',
	'Facts: the facts that support it.',
	'Authority: the cases or provisions it relies on, followed or distinguished ("As in …", "Unlike …").',
	'Strength: how persuasive it is, and why.');

const miratAgainst = p('Arguments: the case for the other party',
	'Topic sentence: the other party\'s argument in reply ("In response, X may argue that …").',
	'Facts and authority: what supports it.',
	'Weighing: which argument is stronger, and why.');

const tentative = p('Tentative conclusion: the most likely outcome',
	'Answer: the most likely outcome on this issue ("It is likely that …").',
	'Reason: the decisive argument.',
	'Contingency: the facts or further information that could change it.');

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
				p('Material facts: the facts that matter',
					'Parties: who the parties are, and their relationship.',
					'Events: what happened, when and where, in order.',
					'Significance: which facts are legally significant, and why.'),
				p('Material facts: gaps and assumptions',
					'Gaps: facts that are unclear or missing.',
					'Assumptions: the assumptions you make, and how a different fact would change the answer.'),
			],
		},
		{ ...issue, name: 'Issues', aliases: [...issue.aliases, 'issues'] },
		{ ...rule('Rules'), aliases: [...rule('Rules').aliases, 'resources', 'rules and resources'] },
		{
			name: 'Arguments',
			aliases: ['arguments', 'argument', 'application', 'analysis'],
			prompts: [miratFor, miratAgainst],
			perIssue: true,
		},
		{
			name: 'Tentative conclusion',
			aliases: ['tentative conclusion', 'conclusion', 'conclusions'],
			prompts: [tentative],
			perIssue: true,
		},
		overall,
	],
	body: [issueQuestion, rulePrompts('Rules')[0]!, miratFor, miratAgainst, tentative],
	sources: [MONASH],
};

// Essays

const roadmap = p('Introduction: the roadmap',
	'Roadmap: the main parts of your argument, in order, usually the strongest first ("Part II examines …; Part III argues …").',
	'Scope: what the essay covers and leaves out (jurisdiction, area of law; the law as it is, or as it should be).',
	'Definitions: key terms, if they need defining, and any assumptions.');

const essayIntroduction = (first: Prompt): PromptSection => ({
	name: 'Introduction',
	aliases: ['introduction', 'intro'],
	prompts: [first, roadmap],
});

const openPart = (link: string): Prompt => p('Opening a part: what it argues',
	'Topic sentence: the claim this part makes, in a sentence.',
	`Link: how it advances ${link}.`,
	'Signpost: the points it covers, in order.');

export const CRITICAL: PromptSet = {
	id: 'critical',
	name: 'Essay: critical analysis',
	kind: 'essay',
	description: 'Take a position and argue it: thesis, supported points, counter-arguments, conclusion.',
	sections: [
		essayIntroduction(p('Introduction: the issue and your thesis',
			'Context: why the issue matters (a recent case, reform, or problem in the law).',
			'Issue: the question the essay answers, in your own words.',
			'Thesis: your position, in one or two sentences ("This essay argues that …"), not just what the essay will do.')),
		{
			name: 'Counter-arguments',
			aliases: ['counter-arguments', 'counterarguments', 'counter-argument', 'counterargument', 'objections', 'criticisms', 'the other view'],
			prompts: [
				p('Counter-argument: the strongest view against your thesis',
					'Concession: the opposing view, fairly put ("It may be argued that …").',
					'Support: who holds it, and its strongest authority.',
					'Rebuttal: why your position still holds, or what it concedes ("However, …").',
					'Link: what this means for your thesis.'),
			],
		},
		{
			name: 'Conclusion',
			aliases: ['conclusion', 'conclusions', 'concluding remarks'],
			prompts: [
				p('Conclusion: draw the argument together (no new arguments or authorities)',
					'Thesis: restate your position, in fresh words, in the light of the analysis.',
					'Synthesis: the main arguments, briefly, and how they fit together.',
					'Significance: what follows: reform, the future of the law, or open questions.',
					'Check: it answers what the introduction promised.'),
			],
		},
	],
	body: [
		openPart('your thesis'),
		p('Body paragraph: one point for your thesis (PEEL)',
			'Point: the topic sentence, the claim this paragraph makes for your thesis.',
			'Evidence: the authority for it (legislation, a case, or commentary), cited in a footnote.',
			'Explanation: analyse, don\'t describe: what the authority shows, why it supports your point, and its limits.',
			'Further support (optional): a second authority, an example, or the opposing reading and why it fails.',
			'Link: tie the point back to your thesis, and lead into the next paragraph.'),
	],
	sources: [UTS, ANU, LATROBE],
};

export const DISCUSS: PromptSet = {
	id: 'discuss',
	name: 'Essay: "discuss" question',
	kind: 'essay',
	description: 'Look at both sides, weigh the arguments and reach a conclusion that answers the question.',
	sections: [
		essayIntroduction(p('Introduction: the question and where you come down',
			'Context: why the question matters.',
			'Task: what "discuss" asks here: explain, analyse, evaluate, or argue for a position. The terms of the question tell you.',
			'Position: where you come down ("This essay argues that, on balance, …").')),
		{
			name: 'Evaluation',
			aliases: ['evaluation', 'evaluating the arguments', 'weighing the arguments', 'assessment', 'discussion'],
			prompts: [
				p('Evaluation: weigh the two sides',
					'Criteria: what makes an argument stronger here: authority, principle, policy, or practical effect.',
					'Weighing: which side is more persuasive against those criteria, and why.',
					'Unsettled: where the law is unsettled, or the authorities conflict.',
					'Position: where the weight of argument lies.'),
			],
		},
		{
			name: 'Conclusion',
			aliases: ['conclusion', 'conclusions', 'concluding remarks'],
			prompts: [
				p('Conclusion: answer the question (no new arguments or authorities)',
					'Answer: answer the question as asked: where does the weight of argument lie?',
					'Reasons: the main reasons, briefly.',
					'Qualifications: the limits of your answer, or what would change it.',
					'Significance: what follows, for the law or its reform.'),
			],
		},
	],
	body: [
		openPart('your answer to the question'),
		p('Body paragraph: one side of the question',
			'Point: the topic sentence, one argument on one side of the question.',
			'Evidence: the authority for it, cited in a footnote.',
			'Explanation: what the authority shows, and how strong the argument is.',
			'Other view: the strongest response from the other side.',
			'Link: tie it back to the question.'),
	],
	sources: [UTS, LATROBE, ANU],
};

export const BUILT_IN_SETS: PromptSet[] = [IRAC, ILAC, HIRAC, MIRAT, CRITICAL, DISCUSS];

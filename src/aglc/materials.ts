/**
 * The kinds of source a footnote can cite, for "Cite a kind of source" and the list offered in an empty
 * footnote: each with its AGLC4 form as a template. `${…}` marks a placeholder to fill in; Tab moves to
 * the next. The examples are generic: they show the form, not real sources.
 */

export interface Material {
	id: string;
	group: string;
	label: string;
	/** When to use it. */
	hint: string;
	/** The AGLC4 form, with `${placeholders}`. */
	template: string;
	example: string;
	ref: string;
}

const CASES = 'Cases';
const LEGISLATION = 'Legislation and parliament';
const REPORTS = 'Government, law reform and inquiry reports';
const SECONDARY = 'Books, articles and theses';
const INTERNATIONAL = 'International materials';
const OTHER = 'Media, internet and other';
const LATER = 'Later references';

export const MATERIALS: Material[] = [
	// Cases
	{
		id: 'case-reported', group: CASES, label: 'Case (reported)',
		hint: 'A case in a law report series: the authorised report where there is one',
		template: '*${Party v Party}* (${Year}) ${Volume} ${CLR} ${Starting page}',
		example: '*Smith v Jones* (1992) 175 CLR 1, 30', ref: 'r 2.2',
	},
	{
		id: 'case-mnc', group: CASES, label: 'Case (medium neutral citation)',
		hint: 'A case with a medium neutral citation, when no report is available',
		template: '*${Party v Party}* [${Year}] ${HCA} ${Number}',
		example: '*Smith v Jones* [2020] HCA 3, [81]', ref: 'r 2.3',
	},
	{
		id: 'case-unreported', group: CASES, label: 'Case (unreported, no medium neutral citation)',
		hint: 'A judgment with neither a report nor a medium neutral citation',
		template: '*${Party v Party}* (${Court}, ${Judge J}, ${1 January 2000})',
		example: '*R v Smith* (Supreme Court of Victoria, Jones J, 12 March 1990)', ref: 'r 2.3',
	},

	// Legislation and parliament
	{
		id: 'act', group: LEGISLATION, label: 'Act of parliament',
		hint: 'Title and year in italics, then the jurisdiction',
		template: '*${Title} ${Year}* (${Cth})',
		example: '*Example Act 2001* (Cth) s 5', ref: 'ch 3',
	},
	{
		id: 'constitution', group: LEGISLATION, label: 'Constitution',
		hint: 'The Australian Constitution, without a year',
		template: '*Australian Constitution* s ${51}',
		example: '*Australian Constitution* s 51(xxxi)', ref: 'ch 3',
	},
	{
		id: 'bill', group: LEGISLATION, label: 'Bill',
		hint: 'Bills are not italicised',
		template: '${Title} Bill ${Year} (${Cth})',
		example: 'Example Bill 2024 (Cth) cl 3', ref: 'ch 3',
	},
	{
		id: 'explanatory', group: LEGISLATION, label: 'Explanatory memorandum',
		hint: 'Explanatory memorandum, statement or note for a Bill',
		template: 'Explanatory Memorandum, ${Title} Bill ${Year} (${Cth})',
		example: 'Explanatory Memorandum, Example Bill 2024 (Cth) 12 [45]', ref: 'ch 3',
	},
	{
		id: 'hansard', group: LEGISLATION, label: 'Parliamentary debates (Hansard)',
		hint: 'A speech in parliament, such as a second reading speech',
		template: '${Commonwealth}, *Parliamentary Debates*, ${House of Representatives}, ${1 January 2000}, ${Page} (${Name of Speaker})',
		example: 'Commonwealth, *Parliamentary Debates*, Senate, 4 June 2020, 4250 (Jane Smith)', ref: 'ch 7',
	},
	{
		id: 'committee-report', group: LEGISLATION, label: 'Parliamentary committee report',
		hint: 'A report of a parliamentary committee, with its parliament',
		template: '${Name of Committee}, Parliament of Australia, *${Title}* (${Report}, ${Month Year})',
		example: 'Senate Example References Committee, Parliament of Australia, *Title of the Inquiry* (Report, March 2015) 23 [2.15]', ref: 'ch 7',
	},
	{
		id: 'submission', group: LEGISLATION, label: 'Submission to an inquiry',
		hint: 'A submission to a parliamentary committee or other inquiry, by its number',
		template: '${Author}, Submission No ${1} to ${Name of Committee}, Parliament of Australia, *${Title of Inquiry}* (${1 January 2000})',
		example: 'Example Law Society, Submission No 12 to Senate Example Legislation Committee, Parliament of Australia, *Inquiry into the Example Bill 2024* (21 March 2024) 4', ref: 'ch 7',
	},

	// Government, law reform and inquiry reports
	{
		id: 'government-report', group: REPORTS, label: 'Government report',
		hint: 'A report of a government department or agency (the department is the author)',
		template: '${Department of Example}, *${Title}* (${Report}, ${Month Year})',
		example: 'Department of Example, *Title of the Report* (Report, October 2020) 7', ref: 'ch 7',
	},
	{
		id: 'pc-inquiry', group: REPORTS, label: 'Productivity Commission inquiry report (final)',
		hint: 'A final inquiry report of the Productivity Commission, by its number and date',
		template: 'Productivity Commission, *${Title}* (Inquiry Report No ${1}, ${1 January 2000})',
		example: 'Productivity Commission, *Title of the Inquiry* (Inquiry Report No 95, 30 June 2020) vol 1, 12', ref: 'ch 7',
	},
	{
		id: 'pc-draft', group: REPORTS, label: 'Productivity Commission draft report',
		hint: 'A draft report released for comment before the final report',
		template: 'Productivity Commission, *${Title}* (Draft Report, ${Month Year})',
		example: 'Productivity Commission, *Title of the Inquiry* (Draft Report, June 2021) 45', ref: 'ch 7',
	},
	{
		id: 'interim-report', group: REPORTS, label: 'Interim report',
		hint: 'An interim report of an inquiry, royal commission, commission or committee',
		template: '${Name of Inquiry or Commission}, *${Title}* (Interim Report, ${Month Year})',
		example: 'Royal Commission into Example Matters, *Interim Report* (Interim Report, October 2019) 12', ref: 'ch 7',
	},
	{
		id: 'final-report', group: REPORTS, label: 'Final report',
		hint: 'The final report of an inquiry, royal commission, commission or committee',
		template: '${Name of Inquiry or Commission}, *${Title}* (Final Report, ${Month Year})',
		example: 'Example Review Panel, *Review of the Example Act* (Final Report, September 2002) 3', ref: 'ch 7',
	},
	{
		id: 'royal-commission', group: REPORTS, label: 'Royal commission report',
		hint: 'A report of a royal commission, often in volumes: give the volume before the page',
		template: 'Royal Commission into ${Subject}, *${Title}* (${Final Report}, ${Month Year})',
		example: 'Royal Commission into Example Matters, *Final Report* (Final Report, December 2017) vol 3, 45', ref: 'ch 7',
	},
	{
		id: 'law-reform-report', group: REPORTS, label: 'Law reform commission report',
		hint: 'A report of a law reform commission, by its number',
		template: '${Australian Law Reform Commission}, *${Title}* (Report No ${1}, ${Month Year})',
		example: 'Australian Law Reform Commission, *Title of the Report* (Report No 126, April 2015) 12 [2.3]', ref: 'ch 7',
	},
	{
		id: 'law-reform-paper', group: REPORTS, label: 'Issues or discussion paper',
		hint: 'A consultation paper of a law reform commission or inquiry, by its number',
		template: '${Australian Law Reform Commission}, *${Title}* (${Discussion Paper} No ${1}, ${Month Year})',
		example: 'Australian Law Reform Commission, *Title of the Review* (Issues Paper No 48, March 2018) 9', ref: 'ch 7',
	},

	// Books, articles and theses
	{
		id: 'journal', group: SECONDARY, label: 'Journal article',
		hint: 'Article title in quotation marks, journal in italics',
		template: '${Author}, \'${Title}\' (${Year}) ${Volume}(${Issue}) *${Journal}* ${Starting page}',
		example: 'Jane Smith, \'Title of the Article\' (2004) 28(1) *Example Law Review* 1, 12', ref: 'ch 5',
	},
	{
		id: 'book', group: SECONDARY, label: 'Book',
		hint: 'Title in italics; publisher, edition (if not the first) and year',
		template: '${Author}, *${Title}* (${Publisher}, ${Year})',
		example: 'Jane Smith, *Principles of Example Law* (Example Press, 3rd ed, 2018) 45', ref: 'ch 6',
	},
	{
		id: 'chapter', group: SECONDARY, label: 'Chapter in an edited book',
		hint: 'Chapter title in quotation marks, then the editor and book',
		template: '${Author}, \'${Chapter Title}\' in ${Editor} (ed), *${Book Title}* (${Publisher}, ${Year}) ${Starting page}',
		example: 'Jane Smith, \'Title of the Chapter\' in Ali Khan (ed), *Title of the Book* (Example Press, 2nd ed, 2015) 10, 15', ref: 'ch 6',
	},

	// International materials
	{
		id: 'treaty', group: INTERNATIONAL, label: 'Treaty',
		hint: 'Title in italics, dates of signature and entry into force, treaty series',
		template: '*${Title}*, opened for signature ${1 January 2000}, ${Volume} UNTS ${Page} (entered into force ${1 January 2000})',
		example: '*Example Convention*, opened for signature 20 November 1989, 1577 UNTS 3 (entered into force 2 September 1990) art 3', ref: 'ch 8',
	},
	{
		id: 'un-resolution', group: INTERNATIONAL, label: 'UN General Assembly resolution',
		hint: 'Title in italics, resolution number, document number and date',
		template: '*${Title}*, GA Res ${61/1}, UN Doc ${A/RES/61/1} (${1 January 2000})',
		example: '*Title of the Resolution*, GA Res 61/1, UN Doc A/RES/61/1 (13 September 2007) art 26', ref: 'ch 9',
	},

	// Media, internet and other
	{
		id: 'newspaper', group: OTHER, label: 'Newspaper article',
		hint: 'Headline in quotation marks, newspaper in italics, place and date',
		template: '${Author}, \'${Headline}\', *${Newspaper}* (${Place}, ${1 January 2000}) ${Page}',
		example: 'Jane Smith, \'Headline of the Article\', *The Example Times* (Melbourne, 5 May 2020) 3', ref: 'ch 7',
	},
	{
		id: 'internet', group: OTHER, label: 'Web page',
		hint: 'Material published only online, with its URL in angle brackets',
		template: '${Author}, \'${Title}\' (${Web Page}, ${1 January 2000}) <${https://}>',
		example: 'Jane Smith, \'Title of the Page\' (Web Page, 1 May 2020) <https://example.org/page>', ref: 'ch 7',
	},
	{
		id: 'speech', group: OTHER, label: 'Speech, media release or paper',
		hint: 'A speech, conference paper, media release or working paper',
		template: '${Author}, \'${Title}\' (${Speech}, ${Event}, ${1 January 2000})',
		example: 'Jane Smith, \'Title of the Speech\' (Speech, Example Conference, 1 May 2020) 4', ref: 'ch 7',
	},

	// Later references
	{
		id: 'ibid', group: LATER, label: 'Ibid',
		hint: 'The single source in the footnote immediately before',
		template: 'Ibid',
		example: 'Ibid 45', ref: 'r 1.4.3',
	},
	{
		id: 'subsequent', group: LATER, label: 'Later reference (n X)',
		hint: 'A source cited in full in an earlier footnote',
		template: '${Short Title or Author Surname} (n ${1})',
		example: '*Smith* (n 3) 30', ref: 'r 1.4.1',
	},
];

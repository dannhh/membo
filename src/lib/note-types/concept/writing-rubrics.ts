export interface WritingRubric {
  id: string;
  name: string;
  prompt: string;
}

const SCORING_INSTRUCTIONS = `Use the official IELTS Writing Band Descriptors below. For each of the four criteria, find the band (2-9) whose descriptors best match the response — use a half band (e.g. 6.5) if it falls between two. Then give an overall band as the average of the four criteria, rounded to the nearest 0.5.`;

const COHERENCE_COHESION = `## Coherence & Cohesion
**Band 9:** Message can be followed effortlessly. Cohesion rarely attracts attention. Coherence/cohesion lapses are minimal. Paragraphing is skilfully managed.
**Band 8:** Message is easy to follow; information and ideas are logically sequenced. Cohesion is well managed, with occasional lapses. Paragraphing is sufficient and appropriate.
**Band 7:** Logical organisation with clear progression throughout; few lapses. Cohesive devices are used flexibly, though some inaccuracies, overuse, or underuse may occur.
**Band 6:** Generally coherent arrangement with clear overall progression. Cohesive devices are used with some success but may be faulty or mechanical; reference/substitution lacks flexibility.
**Band 5:** Organisation exists but is not fully logical; overall progression may be lacking, though underlying coherence remains. Sentences are not fluently linked; cohesive devices are limited or excessive, with repetition.
**Band 4:** Ideas exist but are not coherent; no clear progression. Relationships between ideas are unclear. Only basic cohesive devices are used, and referencing/substitution is weak.
**Band 3:** No logical organisation; ideas are difficult to connect. Minimal cohesive devices; referencing is difficult to identify.
**Band 2:** Little evidence of organisation.`;

const LEXICAL_RESOURCE = `## Lexical Resource
**Band 9:** Full flexibility and precision; wide vocabulary range. Accurate, appropriate, natural and sophisticated lexical control. Spelling/word formation errors are extremely rare and have minimal impact.
**Band 8:** Wide lexical resource; fluent and flexible vocabulary use; precise meanings conveyed. Skilful use of uncommon/idiomatic language. Some inaccuracies may occur; spelling/word formation errors have minimal impact.
**Band 7:** Resource allows flexibility and precision, including some less common/idiomatic language and awareness of style and collocation. Few spelling/word formation errors; errors do not reduce clarity.
**Band 6:** Generally adequate vocabulary; meaning generally clear despite a somewhat restricted range. Lack of precision may occur; risk-taking leads to more errors. Some spelling/word formation errors.
**Band 5:** Limited but minimally adequate vocabulary; simple vocabulary dominates with little variation. Frequent inappropriate word choices and repetition. Spelling errors may affect readability.
**Band 4:** Limited and inadequate vocabulary; basic, repetitive vocabulary, possibly with memorised language. Lexical errors may impede meaning.
**Band 3:** Inadequate resource; overdependence on memorised/input language. Severe word choice/spelling problems; errors may severely impede meaning.
**Band 2:** Extremely limited resource; mostly memorised phrases.`;

const GRAMMATICAL_RANGE = `## Grammatical Range & Accuracy
**Band 9:** Wide structural range with full flexibility and control. Grammar and punctuation are appropriate throughout; errors are extremely rare and have minimal impact.
**Band 8:** Wide structural range, flexible and accurate. Majority of sentences are error-free; punctuation is well managed. Occasional non-systematic errors with minimal impact.
**Band 7:** Variety of complex structures with some flexibility and accuracy. Grammar and punctuation are generally well controlled; error-free sentences are frequent. Few remaining errors do not impede communication.
**Band 6:** Mix of simple and complex sentences with limited flexibility; complex structures are less accurate. Grammar/punctuation errors occur but rarely impede communication.
**Band 5:** Limited and repetitive structures; complex sentences are attempted but faulty, while simple sentences are strongest. Frequent grammar errors; punctuation may be faulty.
**Band 4:** Very limited structures; simple sentences dominate and subordinate clauses are rare. Frequent grammar errors that may impede meaning; punctuation often faulty.
**Band 3:** Grammar and punctuation errors dominate; meaning is often lost; sentence control is insufficient.
**Band 2:** Little or no evidence of sentence forms.`;

const TASK_ACHIEVEMENT_ACADEMIC = `## Task Achievement
**Band 9:** All task requirements are fully and appropriately satisfied. Content lapses are extremely rare.
**Band 8:** Covers all requirements appropriately; content is relevant and sufficient. Key features are skilfully selected, clearly presented, highlighted and illustrated. Occasional omissions may occur.
**Band 7:** Covers task requirements; content is relevant and accurate, with few omissions. Format is appropriate. Key features are covered and highlighted, with a clear overview, data appropriately categorised, and main trends/differences identified.
**Band 6:** Focuses on task requirements in an appropriate format. Key features are adequately highlighted, with a relevant overview attempted and data appropriately selected and supported. Some irrelevant/inaccurate or missing/excessive details may occur.
**Band 5:** Generally addresses the task, though format may sometimes be inappropriate. Key features are inadequately covered; description is mechanical and may lack supporting data, or focus excessively on details while missing the bigger picture. Irrelevant/inaccurate material hurts performance; limited extension and illustration.
**Band 4:** Only attempts to address the task. Few key features selected; purpose unclear; tone inappropriate; format may be inappropriate. Features may be irrelevant, repetitive or inaccurate.
**Band 3:** Does not address task requirements; misunderstanding is possible. Key features are largely irrelevant; information is limited and repetitive.
**Band 2:** Barely related to the task; very little relevant message, possibly entirely off-topic.`;

const TASK_ACHIEVEMENT_GENERAL = `## Task Achievement
**Band 9:** All task requirements are fully and appropriately satisfied. Content lapses are extremely rare.
**Band 8:** Covers all requirements appropriately; content is relevant and sufficient. Bullet points are clearly presented and appropriately illustrated or extended. Occasional omissions may occur.
**Band 7:** Covers task requirements; content is relevant and accurate, with few omissions. Format is appropriate. All bullet points are covered; purpose is clear; tone is consistent and appropriate; lapses are minimal.
**Band 6:** Focuses on task requirements in an appropriate format. Bullet points are adequately highlighted; purpose is generally clear, though minor tone inconsistencies may occur. Some irrelevant/inaccurate or missing/excessive details may occur.
**Band 5:** Generally addresses the task, though format may sometimes be inappropriate. Key features are inadequately covered; description is mechanical and may lack supporting data, or focus excessively on details while missing the bigger picture. Irrelevant/inaccurate material hurts performance; limited extension and illustration.
**Band 4:** Only attempts to address the task. Bullet points may be missing; purpose unclear; tone inappropriate; format may be inappropriate. Features may be irrelevant, repetitive or inaccurate.
**Band 3:** Does not address task requirements; misunderstanding is possible. Key features are largely irrelevant; information is limited and repetitive.
**Band 2:** Barely related to the task; very little relevant message, possibly entirely off-topic.`;

const TASK_RESPONSE = `## Task Response
**Band 9:** The prompt is appropriately addressed and explored in depth, with a fully developed position and well-supported, relevant ideas.
**Band 8:** The prompt is appropriately and sufficiently addressed, with a clear, well-supported position and relevant extension of ideas. Occasional lapses may occur.
**Band 7:** The main parts of the prompt are appropriately addressed, with a clear position and supported main ideas, though some may be underdeveloped.
**Band 6:** The main parts of the prompt are addressed, but coverage is uneven — some parts are more fully developed than others. Position is clear but not always maintained.
**Band 5:** The main parts of the prompt are incompletely addressed; the format may be inappropriate in places. Position is unclear or not maintained throughout; limited support and development of ideas.
**Band 4:** The response is minimal or tangential to the prompt; position is unclear. Ideas are largely undeveloped, irrelevant, or repetitive.
**Band 3:** The prompt appears to have been misunderstood; response strays from the topic.
**Band 2:** Barely related to the prompt.`;

const WORD_COUNT_TASK1 = `Word count should be 150+; flag if under.`;
const WORD_COUNT_TASK2 = `Word count should be 250+; flag if under.`;

export const BUILTIN_WRITING_RUBRICS: WritingRubric[] = [
  {
    id: "ielts-task1-academic",
    name: "IELTS Writing Task 1 (Academic)",
    prompt: `Grade as IELTS Academic Writing Task 1 (describing a chart, graph, table, map, or diagram).

${SCORING_INSTRUCTIONS}

${TASK_ACHIEVEMENT_ACADEMIC}

${COHERENCE_COHESION}

${LEXICAL_RESOURCE}

${GRAMMATICAL_RANGE}

${WORD_COUNT_TASK1}`,
  },
  {
    id: "ielts-task1-general",
    name: "IELTS Writing Task 1 (General)",
    prompt: `Grade as IELTS General Training Writing Task 1 (a letter — formal, semi-formal, or informal).

${SCORING_INSTRUCTIONS}

${TASK_ACHIEVEMENT_GENERAL}

${COHERENCE_COHESION}

${LEXICAL_RESOURCE}

${GRAMMATICAL_RANGE}

${WORD_COUNT_TASK1}`,
  },
  {
    id: "ielts-task2",
    name: "IELTS Writing Task 2",
    prompt: `Grade as IELTS Writing Task 2 (an essay responding to a point of view, argument, or problem).

${SCORING_INSTRUCTIONS}

${TASK_RESPONSE}

${COHERENCE_COHESION}

${LEXICAL_RESOURCE}

${GRAMMATICAL_RANGE}

${WORD_COUNT_TASK2}`,
  },
];

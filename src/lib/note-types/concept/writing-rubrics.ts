export interface WritingRubric {
  id: string;
  name: string;
  prompt: string;
}

export const BUILTIN_WRITING_RUBRICS: WritingRubric[] = [
  {
    id: "ielts-task1-academic",
    name: "IELTS Writing Task 1 (Academic)",
    prompt: `Grade as IELTS Academic Writing Task 1 (describing a chart, graph, table, map, or diagram).

Score each criterion 0-9, then give an overall band (average, rounded to nearest 0.5):
- **Task Achievement**: Does it cover all key features and trends? Is there a clear overview? Are comparisons accurate and data-supported?
- **Coherence & Cohesion**: Logical paragraphing, clear progression, appropriate linking words (not overused/mechanical).
- **Lexical Resource**: Range and accuracy of vocabulary, especially data/trend language (e.g. "fluctuated", "a slight decline").
- **Grammatical Range & Accuracy**: Sentence variety, accuracy, appropriate tense (usually present/past depending on data type).

Word count should be 150+; flag if under.`,
  },
  {
    id: "ielts-task1-general",
    name: "IELTS Writing Task 1 (General)",
    prompt: `Grade as IELTS General Training Writing Task 1 (a letter — formal, semi-formal, or informal).

Score each criterion 0-9, then give an overall band (average, rounded to nearest 0.5):
- **Task Achievement**: Covers all three bullet points, appropriate tone/register for the letter type, clear purpose.
- **Coherence & Cohesion**: Logical structure (greeting, body, sign-off), clear linking between ideas.
- **Lexical Resource**: Range and appropriateness of vocabulary for the register (formal vs. informal).
- **Grammatical Range & Accuracy**: Sentence variety, accuracy, correct tone-appropriate structures.

Word count should be 150+; flag if under.`,
  },
  {
    id: "ielts-task2",
    name: "IELTS Writing Task 2",
    prompt: `Grade as IELTS Writing Task 2 (an essay responding to a point of view, argument, or problem).

Score each criterion 0-9, then give an overall band (average, rounded to nearest 0.5):
- **Task Response**: Fully addresses all parts of the prompt, clear position throughout, ideas extended and supported with relevant examples.
- **Coherence & Cohesion**: Logical paragraphing (intro/body/conclusion), clear progression, effective linking devices.
- **Lexical Resource**: Range, precision, and naturalness of vocabulary; avoids repetition.
- **Grammatical Range & Accuracy**: Variety of complex structures, accuracy, error frequency/severity.

Word count should be 250+; flag if under.`,
  },
];

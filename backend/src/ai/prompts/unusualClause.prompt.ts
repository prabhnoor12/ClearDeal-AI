// Prompt template for unusual clause detection
export const UNUSUAL_CLAUSE_PROMPT = `
Identify any unusual or non-standard clauses in the following contract. For each, provide:
- Clause text
- Reason why it is unusual

Contract:
{{contractText}}
`;

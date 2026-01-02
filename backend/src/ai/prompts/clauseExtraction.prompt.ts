// Prompt template for clause extraction
export const CLAUSE_EXTRACTION_PROMPT = `
Extract all clauses from the following real estate contract. For each clause, provide:
- Clause text
- Clause type (standard, unusual, custom)
- Flagged (true/false if risky or unusual)

Contract:
{{contractText}}
`;

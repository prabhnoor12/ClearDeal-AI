// Prompt template for risk explanation
export const RISK_EXPLANATION_PROMPT = `
Explain the risks found in the following contract in plain English. For each risk, provide:
- Risk code
- Description
- Severity (low, medium, high, critical)

Contract:
{{contractText}}
`;

export type IntelligenceCategory =
  | 'MODEL_RELEASE'
    | 'REGULATION'
      | 'FUNDING'
        | 'COMPANY_MOVE'
          | 'RESEARCH'
            | 'POLICY';

            // Classify an article by its text content using keyword matching.
            export function classifyArticle(text: string): IntelligenceCategory {
              const t = text.toLowerCase();

                if (/\b(raises?|raised|funding|invest|billion|million|series [a-d]|ipo|valuation)\b/.test(t)) {
                    return 'FUNDING';
                      }
                        if (/\b(model|gpt|claude|gemini|llama|mistral|launch|release|debut|unveil)\b/.test(t)) {
                            return 'MODEL_RELEASE';
                              }
                                if (/\b(regulat|law|legislat|bill|ban|complian|sanction|prohibit|fcc|ftc|gdpr|eu ai)\b/.test(t)) {
                                    return 'REGULATION';
                                      }
                                        if (/\b(policy|polic|government|white house|executive order|senate|congress|parliament|ministry)\b/.test(t)) {
                                            return 'POLICY';
                                              }
                                                if (/\b(research|study|paper|benchmark|findings?|published|arxiv|university)\b/.test(t)) {
                                                    return 'RESEARCH';
                                                      }
                                                        return 'COMPANY_MOVE';
                                                        }
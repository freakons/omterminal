/**
 *  * Intelligence Article Classifier
  * Maps article text to OM Terminal intelligence categories.
   * Used by the ingestion pipeline to classify GNews articles.
    */

    export type IntelligenceCategory =
      | 'MODEL_RELEASE'
        | 'REGULATION'
          | 'FUNDING'
            | 'COMPANY_MOVE'
              | 'RESEARCH'
                | 'POLICY';

                /**
                 * Classify an article by its text content.
                  * Uses keyword matching for performance (no AI calls needed).
                   */
                   export function classifyArticle(text: string): IntelligenceCategory {
                     const t = text.toLowerCase();

                       // Funding: raises, investment, VC, billion
                         if (/\b(raises?|raised|funding|invest|billion|million|series [a-d]|ipo|valuation)\b/.test(t)) {
                             return 'FUNDING';
                               }

                                 // Model Release: specific model names or launch language
                                   if (/\b(model|gpt|claude|gemini|llama|mistral|launch|release|debut|unveil)\b/.test(t)) {
                                       return 'MODEL_RELEASE';
                                         }

                                           // Regulation: legal/regulatory language
                                             if (/\b(regulat|law|legislat|bill|ban|complian|sanction|prohibit|fcc|ftc|gdpr|eu ai)\b/.test(t)) {
                                                 return 'REGULATION';
                                                   }

                                                     // Policy: government/institutional policy
                                                       if (/\b(policy|polic|government|white house|executive order|senate|congress|parliament|ministry)\b/.test(t)) {
                                                           return 'POLICY';
                                                             }

                                                               // Research: academic/study language
                                                                 if (/\b(research|study|paper|benchmark|findings?|published|arxiv|university)\b/.test(t)) {
                                                                     return 'RESEARCH';
                                                                       }

                                                                         // Default: company move (acquisition, partnership, leadership)
                                                                           return 'COMPANY_MOVE';
                                                                           }
 */
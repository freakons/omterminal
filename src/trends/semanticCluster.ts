import { embedText, cosineSimilarity } from './embeddings';

const SIMILARITY_THRESHOLD = 0.85;

export interface SemanticCluster {
  topic: string;
  embedding: number[];
  members: string[];
}

export async function clusterTopicsSemantic(topics: string[]): Promise<SemanticCluster[]> {
  const clusters: SemanticCluster[] = [];

  for (const topic of topics) {
    const embedding = await embedText(topic);
    let matched = false;

    for (const cluster of clusters) {
      const sim = cosineSimilarity(embedding, cluster.embedding);
      if (sim > SIMILARITY_THRESHOLD) {
        cluster.members.push(topic);
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({ topic, embedding, members: [topic] });
    }
  }

  return clusters;
}

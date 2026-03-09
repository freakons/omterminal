import { embedText, cosineSimilarity } from './embeddings';

const SIMILARITY_THRESHOLD = 0.85;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '');
}

function isSimilar(a: string, b: string): boolean {
  const aw = normalize(a).split(' ').filter(Boolean);
  const bw = normalize(b).split(' ').filter(Boolean);
  const overlap = aw.filter((w) => bw.includes(w)).length;
  return overlap >= Math.min(aw.length, bw.length) / 2;
}

export async function clusterTopics(topics: string[]): Promise<string[][]> {
  // Pre-compute embeddings for all topics in parallel.
  // embedText returns [] when no API key is set.
  const embeddings = await Promise.all(topics.map((t) => embedText(t)));
  const hasEmbeddings = embeddings.some((e) => e.length > 0);

  const clusters: string[][] = [];
  const clusterEmbeddings: number[][] = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    let found = false;

    for (let j = 0; j < clusters.length; j++) {
      const similar = hasEmbeddings && embeddings[i].length > 0 && clusterEmbeddings[j].length > 0
        ? cosineSimilarity(embeddings[i], clusterEmbeddings[j]) > SIMILARITY_THRESHOLD
        : isSimilar(topic, clusters[j][0]);

      if (similar) {
        clusters[j].push(topic);
        found = true;
        break;
      }
    }

    if (!found) {
      clusters.push([topic]);
      clusterEmbeddings.push(embeddings[i]);
    }
  }

  return clusters;
}

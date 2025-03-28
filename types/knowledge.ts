export interface KnowledgeChunk {
  id?: number;
  content: string;
  source?: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  created_at?: Date;
  updated_at?: Date;
}

export interface SearchResult {
  id: number;
  content: string;
  source: string | null;
  metadata: Record<string, any>;
  similarity: number;
} 
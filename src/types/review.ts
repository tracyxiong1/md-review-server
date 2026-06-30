export type ReviewCommentStatus =
  | 'open'
  | 'resolved'
  | 'partially_resolved'
  | 'unresolved'
  | 'ignored';

export interface ReviewComment {
  id: string;
  file?: string;
  documentVersion?: string;
  startLine: number;
  endLine: number;
  startOffset?: number;
  endOffset?: number;
  selectedText: string;
  beforeText?: string;
  afterText?: string;
  comment: string;
  status: ReviewCommentStatus;
  targetFile?: string;
  targetStartLine?: number;
  targetEndLine?: number;
  targetSelectedText?: string;
  resolution?: string;
  consumedBy?: string;
  consumedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCommentInput {
  file: string;
  startLine: number;
  endLine: number;
  startOffset?: number;
  endOffset?: number;
  selectedText: string;
  beforeText?: string;
  afterText?: string;
  comment: string;
}

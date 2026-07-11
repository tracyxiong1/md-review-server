export type ReviewCommentStatus =
  | 'open'
  | 'resolved'
  | 'partially_resolved'
  | 'unresolved'
  | 'ignored';

export type ReviewCommentReplyAuthor = 'user' | 'codex';

export interface ReviewCommentReply {
  id: string;
  author: ReviewCommentReplyAuthor;
  body: string;
  createdAt: string;
}

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
  /** One-based absolute lines in targetFile, including frontmatter and MDX imports/exports. */
  targetStartLine?: number;
  targetEndLine?: number;
  targetSelectedText?: string;
  resolution?: string;
  replies?: ReviewCommentReply[];
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

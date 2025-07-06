export interface PostWithComments {
  id: number;
  title: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  authorUsername: string;
  subredditId?: number;
  votes: number;
  commentCount: number;
  createdAt: Date;
  comments?: CommentWithReplies[];
}

export interface CommentWithReplies {
  id: number;
  content: string;
  authorUsername: string;
  postId: number;
  parentId?: number;
  votes: number;
  depth: number;
  createdAt: Date;
  replies: CommentWithReplies[];
}

export interface UserVote {
  postId?: number;
  commentId?: number;
  voteType: number; // 1 for upvote, -1 for downvote
}

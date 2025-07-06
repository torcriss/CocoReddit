import { 
  subreddits, 
  posts, 
  comments, 
  votes,
  type Subreddit, 
  type Post, 
  type Comment, 
  type Vote,
  type InsertSubreddit, 
  type InsertPost, 
  type InsertComment, 
  type InsertVote 
} from "@shared/schema";

export interface IStorage {
  // Subreddits
  getSubreddits(): Promise<Subreddit[]>;
  getSubreddit(id: number): Promise<Subreddit | undefined>;
  createSubreddit(subreddit: InsertSubreddit): Promise<Subreddit>;

  // Posts
  getPosts(subredditId?: number, sortBy?: string): Promise<Post[]>;
  getPost(id: number): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;
  searchPosts(query: string): Promise<Post[]>;

  // Comments
  getCommentsByPost(postId: number): Promise<Comment[]>;
  getComment(id: number): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, updates: Partial<Comment>): Promise<Comment | undefined>;
  deleteComment(id: number): Promise<boolean>;

  // Votes
  getVote(userId: string, postId?: number, commentId?: number): Promise<Vote | undefined>;
  createVote(vote: InsertVote): Promise<Vote>;
  updateVote(id: number, voteType: number): Promise<Vote | undefined>;
  deleteVote(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private subreddits: Map<number, Subreddit>;
  private posts: Map<number, Post>;
  private comments: Map<number, Comment>;
  private votes: Map<number, Vote>;
  private currentSubredditId: number;
  private currentPostId: number;
  private currentCommentId: number;
  private currentVoteId: number;

  constructor() {
    this.subreddits = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.votes = new Map();
    this.currentSubredditId = 1;
    this.currentPostId = 1;
    this.currentCommentId = 1;
    this.currentVoteId = 1;

    // Initialize with some default subreddits
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const defaultSubreddits = [
      { name: "webdev", description: "Web development discussions", memberCount: 2100000 },
      { name: "programming", description: "Programming topics and tutorials", memberCount: 4200000 },
      { name: "askreddit", description: "Ask and answer questions", memberCount: 34200000 },
    ];

    defaultSubreddits.forEach(sub => {
      const subreddit: Subreddit = {
        id: this.currentSubredditId++,
        ...sub,
        createdAt: new Date(),
      };
      this.subreddits.set(subreddit.id, subreddit);
    });
  }

  // Subreddits
  async getSubreddits(): Promise<Subreddit[]> {
    return Array.from(this.subreddits.values());
  }

  async getSubreddit(id: number): Promise<Subreddit | undefined> {
    return this.subreddits.get(id);
  }

  async createSubreddit(insertSubreddit: InsertSubreddit): Promise<Subreddit> {
    const subreddit: Subreddit = {
      id: this.currentSubredditId++,
      ...insertSubreddit,
      memberCount: 0,
      createdAt: new Date(),
    };
    this.subreddits.set(subreddit.id, subreddit);
    return subreddit;
  }

  // Posts
  async getPosts(subredditId?: number, sortBy: string = "hot"): Promise<Post[]> {
    let postsArray = Array.from(this.posts.values());
    
    if (subredditId) {
      postsArray = postsArray.filter(post => post.subredditId === subredditId);
    }

    // Sort posts
    switch (sortBy) {
      case "new":
        postsArray.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        break;
      case "top":
        postsArray.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        break;
      case "hot":
      default:
        // Simple hot algorithm: combine votes and recency
        postsArray.sort((a, b) => {
          const aScore = (a.votes || 0) + (a.commentCount || 0) * 2;
          const bScore = (b.votes || 0) + (b.commentCount || 0) * 2;
          return bScore - aScore;
        });
        break;
    }

    return postsArray;
  }

  async getPost(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const post: Post = {
      id: this.currentPostId++,
      ...insertPost,
      votes: 0,
      commentCount: 0,
      createdAt: new Date(),
    };
    this.posts.set(post.id, post);
    return post;
  }

  async updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, ...updates };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number): Promise<boolean> {
    return this.posts.delete(id);
  }

  async searchPosts(query: string): Promise<Post[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.posts.values()).filter(post => 
      post.title.toLowerCase().includes(lowercaseQuery) ||
      (post.content && post.content.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Comments
  async getCommentsByPost(postId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }

  async getComment(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    // Calculate depth based on parent
    let depth = 0;
    if (insertComment.parentId) {
      const parent = this.comments.get(insertComment.parentId);
      if (parent) {
        depth = (parent.depth || 0) + 1;
      }
    }

    const comment: Comment = {
      id: this.currentCommentId++,
      ...insertComment,
      depth,
      votes: 0,
      createdAt: new Date(),
    };
    this.comments.set(comment.id, comment);

    // Update post comment count
    if (comment.postId) {
      const post = this.posts.get(comment.postId);
      if (post) {
        await this.updatePost(comment.postId, { 
          commentCount: (post.commentCount || 0) + 1 
        });
      }
    }

    return comment;
  }

  async updateComment(id: number, updates: Partial<Comment>): Promise<Comment | undefined> {
    const comment = this.comments.get(id);
    if (!comment) return undefined;
    
    const updatedComment = { ...comment, ...updates };
    this.comments.set(id, updatedComment);
    return updatedComment;
  }

  async deleteComment(id: number): Promise<boolean> {
    const comment = this.comments.get(id);
    if (!comment) return false;

    // Update post comment count
    if (comment.postId) {
      const post = this.posts.get(comment.postId);
      if (post) {
        await this.updatePost(comment.postId, { 
          commentCount: Math.max(0, (post.commentCount || 0) - 1)
        });
      }
    }

    return this.comments.delete(id);
  }

  // Votes
  async getVote(userId: string, postId?: number, commentId?: number): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find(vote => 
      vote.userId === userId && 
      vote.postId === postId && 
      vote.commentId === commentId
    );
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const vote: Vote = {
      id: this.currentVoteId++,
      ...insertVote,
    };
    this.votes.set(vote.id, vote);

    // Update vote counts
    if (vote.postId) {
      const post = this.posts.get(vote.postId);
      if (post) {
        await this.updatePost(vote.postId, { 
          votes: (post.votes || 0) + vote.voteType 
        });
      }
    }

    if (vote.commentId) {
      const comment = this.comments.get(vote.commentId);
      if (comment) {
        await this.updateComment(vote.commentId, { 
          votes: (comment.votes || 0) + vote.voteType 
        });
      }
    }

    return vote;
  }

  async updateVote(id: number, voteType: number): Promise<Vote | undefined> {
    const vote = this.votes.get(id);
    if (!vote) return undefined;

    const oldVoteType = vote.voteType;
    const updatedVote = { ...vote, voteType };
    this.votes.set(id, updatedVote);

    // Update vote counts
    const voteDiff = voteType - oldVoteType;
    
    if (vote.postId) {
      const post = this.posts.get(vote.postId);
      if (post) {
        await this.updatePost(vote.postId, { 
          votes: (post.votes || 0) + voteDiff 
        });
      }
    }

    if (vote.commentId) {
      const comment = this.comments.get(vote.commentId);
      if (comment) {
        await this.updateComment(vote.commentId, { 
          votes: (comment.votes || 0) + voteDiff 
        });
      }
    }

    return updatedVote;
  }

  async deleteVote(id: number): Promise<boolean> {
    const vote = this.votes.get(id);
    if (!vote) return false;

    // Update vote counts
    if (vote.postId) {
      const post = this.posts.get(vote.postId);
      if (post) {
        await this.updatePost(vote.postId, { 
          votes: (post.votes || 0) - vote.voteType 
        });
      }
    }

    if (vote.commentId) {
      const comment = this.comments.get(vote.commentId);
      if (comment) {
        await this.updateComment(vote.commentId, { 
          votes: (comment.votes || 0) - vote.voteType 
        });
      }
    }

    return this.votes.delete(id);
  }
}

export const storage = new MemStorage();

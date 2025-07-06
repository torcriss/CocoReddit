import { 
  subreddits, 
  posts, 
  comments, 
  votes,
  savedPosts,
  users,
  type Subreddit, 
  type Post, 
  type Comment, 
  type Vote,
  type SavedPost,
  type User,
  type UpsertUser,
  type InsertSubreddit, 
  type InsertPost, 
  type InsertComment, 
  type InsertVote,
  type InsertSavedPost
} from "@shared/schema";
import { db } from "./db";
import { eq, like, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Subreddits
  getSubreddits(): Promise<Subreddit[]>;
  getSubreddit(id: number): Promise<Subreddit | undefined>;
  createSubreddit(subreddit: InsertSubreddit): Promise<Subreddit>;

  // Posts
  getPosts(subredditId?: number, sortBy?: string, page?: number, limit?: number): Promise<Post[]>;
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

  // Saved Posts
  getSavedPosts(userId: string): Promise<Post[]>;
  getSavedPost(userId: string, postId: number): Promise<SavedPost | undefined>;
  savePost(savedPost: InsertSavedPost): Promise<SavedPost>;
  unsavePost(userId: string, postId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getSubreddits(): Promise<Subreddit[]> {
    return await db.select().from(subreddits).orderBy(desc(subreddits.memberCount));
  }

  async getSubreddit(id: number): Promise<Subreddit | undefined> {
    const [subreddit] = await db.select().from(subreddits).where(eq(subreddits.id, id));
    return subreddit || undefined;
  }

  async createSubreddit(insertSubreddit: InsertSubreddit): Promise<Subreddit> {
    const [subreddit] = await db
      .insert(subreddits)
      .values({
        name: insertSubreddit.name,
        description: insertSubreddit.description || null,
      })
      .returning();
    return subreddit;
  }

  // Posts
  async getPosts(subredditId?: number, sortBy: string = "hot", page: number = 1, limit: number = 10): Promise<Post[]> {
    const offset = (page - 1) * limit;
    
    // Apply sorting with pagination
    switch (sortBy) {
      case "new":
        if (subredditId) {
          return await db.select().from(posts).where(eq(posts.subredditId, subredditId)).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);
        }
        return await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);
      case "top":
        if (subredditId) {
          return await db.select().from(posts).where(eq(posts.subredditId, subredditId)).orderBy(desc(posts.votes)).limit(limit).offset(offset);
        }
        return await db.select().from(posts).orderBy(desc(posts.votes)).limit(limit).offset(offset);
      case "hot":
      default:
        // Simple hot algorithm: order by votes + comment count
        if (subredditId) {
          return await db.select().from(posts).where(eq(posts.subredditId, subredditId)).orderBy(desc(posts.votes), desc(posts.commentCount)).limit(limit).offset(offset);
        }
        return await db.select().from(posts).orderBy(desc(posts.votes), desc(posts.commentCount)).limit(limit).offset(offset);
    }
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values({
        title: insertPost.title,
        content: insertPost.content || null,
        imageUrl: insertPost.imageUrl || null,
        linkUrl: insertPost.linkUrl || null,
        authorUsername: insertPost.authorUsername,
        subredditId: insertPost.subredditId || null,
      })
      .returning();
    return post;
  }

  async updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();
    return post || undefined;
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchPosts(query: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(
        like(posts.title, `%${query}%`)
      )
      .orderBy(desc(posts.votes));
  }

  // Comments
  async getCommentsByPost(postId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.votes));
  }

  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment || undefined;
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    // Calculate depth based on parent
    let depth = 0;
    if (insertComment.parentId) {
      const parent = await this.getComment(insertComment.parentId);
      if (parent) {
        depth = (parent.depth || 0) + 1;
      }
    }

    const [comment] = await db
      .insert(comments)
      .values({
        content: insertComment.content,
        authorUsername: insertComment.authorUsername,
        postId: insertComment.postId || null,
        parentId: insertComment.parentId || null,
        depth,
      })
      .returning();

    // Update post comment count
    if (comment.postId) {
      const commentCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.postId, comment.postId));

      await db
        .update(posts)
        .set({ commentCount: commentCount[0].count })
        .where(eq(posts.id, comment.postId));
    }

    return comment;
  }

  async updateComment(id: number, updates: Partial<Comment>): Promise<Comment | undefined> {
    const [comment] = await db
      .update(comments)
      .set(updates)
      .where(eq(comments.id, id))
      .returning();
    return comment || undefined;
  }

  async deleteComment(id: number): Promise<boolean> {
    const comment = await this.getComment(id);
    if (!comment) return false;

    const result = await db.delete(comments).where(eq(comments.id, id));
    
    // Update post comment count
    if (comment.postId) {
      const commentCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.postId, comment.postId));

      await db
        .update(posts)
        .set({ commentCount: commentCount[0].count })
        .where(eq(posts.id, comment.postId));
    }

    return (result.rowCount || 0) > 0;
  }

  // Votes
  async getVote(userId: string, postId?: number, commentId?: number): Promise<Vote | undefined> {
    const conditions = [eq(votes.userId, userId)];
    
    if (postId !== undefined) {
      conditions.push(eq(votes.postId, postId));
    }
    if (commentId !== undefined) {
      conditions.push(eq(votes.commentId, commentId));
    }

    const [vote] = await db
      .select()
      .from(votes)
      .where(and(...conditions));
    
    return vote || undefined;
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const [vote] = await db
      .insert(votes)
      .values({
        userId: insertVote.userId,
        postId: insertVote.postId || null,
        commentId: insertVote.commentId || null,
        voteType: insertVote.voteType,
      })
      .returning();

    // Update vote counts
    if (vote.postId) {
      // Calculate current vote total for this post
      const voteSum = await db
        .select({ total: sql<number>`COALESCE(SUM(vote_type), 0)` })
        .from(votes)
        .where(eq(votes.postId, vote.postId));
      
      await db
        .update(posts)
        .set({ votes: voteSum[0].total })
        .where(eq(posts.id, vote.postId));
    }

    if (vote.commentId) {
      await db
        .update(comments)
        .set({
          votes: sql`${comments.votes} + ${vote.voteType}`
        })
        .where(eq(comments.id, vote.commentId));
    }

    return vote;
  }

  async updateVote(id: number, voteType: number): Promise<Vote | undefined> {
    const existingVote = await db.select().from(votes).where(eq(votes.id, id));
    if (!existingVote[0]) return undefined;

    const oldVoteType = existingVote[0].voteType;
    const voteDiff = voteType - oldVoteType;

    const [updatedVote] = await db
      .update(votes)
      .set({ voteType })
      .where(eq(votes.id, id))
      .returning();

    // Update vote counts
    if (updatedVote.postId) {
      // Calculate current vote total for this post
      const voteSum = await db
        .select({ total: sql<number>`COALESCE(SUM(vote_type), 0)` })
        .from(votes)
        .where(eq(votes.postId, updatedVote.postId));
      
      await db
        .update(posts)
        .set({ votes: voteSum[0].total })
        .where(eq(posts.id, updatedVote.postId));
    }

    if (updatedVote.commentId) {
      await db
        .update(comments)
        .set({
          votes: sql`${comments.votes} + ${voteDiff}`
        })
        .where(eq(comments.id, updatedVote.commentId));
    }

    return updatedVote;
  }

  async deleteVote(id: number): Promise<boolean> {
    const existingVote = await db.select().from(votes).where(eq(votes.id, id));
    if (!existingVote[0]) return false;

    const vote = existingVote[0];
    const result = await db.delete(votes).where(eq(votes.id, id));

    // Update vote counts
    if (vote.postId) {
      // Calculate current vote total for this post
      const voteSum = await db
        .select({ total: sql<number>`COALESCE(SUM(vote_type), 0)` })
        .from(votes)
        .where(eq(votes.postId, vote.postId));
      
      await db
        .update(posts)
        .set({ votes: voteSum[0].total })
        .where(eq(posts.id, vote.postId));
    }

    if (vote.commentId) {
      await db
        .update(comments)
        .set({
          votes: sql`${comments.votes} - ${vote.voteType}`
        })
        .where(eq(comments.id, vote.commentId));
    }

    return (result.rowCount || 0) > 0;
  }

  // Saved Posts
  async getSavedPosts(userId: string): Promise<Post[]> {
    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        imageUrl: posts.imageUrl,
        linkUrl: posts.linkUrl,
        authorUsername: posts.authorUsername,
        subredditId: posts.subredditId,
        votes: posts.votes,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
      })
      .from(savedPosts)
      .innerJoin(posts, eq(savedPosts.postId, posts.id))
      .where(eq(savedPosts.userId, userId))
      .orderBy(desc(savedPosts.createdAt));
    
    return result;
  }

  async getSavedPost(userId: string, postId: number): Promise<SavedPost | undefined> {
    const [savedPost] = await db
      .select()
      .from(savedPosts)
      .where(and(eq(savedPosts.userId, userId), eq(savedPosts.postId, postId)));
    
    return savedPost || undefined;
  }

  async savePost(insertSavedPost: InsertSavedPost): Promise<SavedPost> {
    const [savedPost] = await db
      .insert(savedPosts)
      .values({
        userId: insertSavedPost.userId,
        postId: insertSavedPost.postId,
      })
      .onConflictDoNothing()
      .returning();

    return savedPost;
  }

  async unsavePost(userId: string, postId: number): Promise<boolean> {
    const result = await db
      .delete(savedPosts)
      .where(and(eq(savedPosts.userId, userId), eq(savedPosts.postId, postId)));
    
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
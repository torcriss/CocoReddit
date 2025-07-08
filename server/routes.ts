import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertCommentSchema, insertVoteSchema, insertSubredditSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // Subreddits
  app.get("/api/subreddits", async (req, res) => {
    try {
      const subreddits = await storage.getSubreddits();
      res.json(subreddits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subreddits" });
    }
  });

  app.get("/api/subreddits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subreddit = await storage.getSubreddit(id);
      if (!subreddit) {
        return res.status(404).json({ error: "Subreddit not found" });
      }
      res.json(subreddit);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subreddit" });
    }
  });

  app.post("/api/subreddits", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSubredditSchema.parse(req.body);
      const subreddit = await storage.createSubreddit(validatedData);
      res.status(201).json(subreddit);
    } catch (error) {
      res.status(400).json({ error: "Invalid subreddit data" });
    }
  });

  // Posts
  app.get("/api/posts", async (req, res) => {
    try {
      const { subredditId, sortBy, search, page = "1", limit = "10" } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      
      if (search) {
        const posts = await storage.searchPosts(search as string);
        res.json(posts);
      } else {
        const posts = await storage.getPosts(
          subredditId ? parseInt(subredditId as string) : undefined,
          sortBy as string,
          pageNum,
          limitNum
        );
        res.json(posts);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getPost(id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.post("/api/posts", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(validatedData);
      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ error: "Invalid post data" });
    }
  });

  app.patch("/api/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.updatePost(id, req.body);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePost(id);
      if (!deleted) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Comments
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const comments = await storage.getCommentsByPost(postId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ error: "Invalid comment data" });
    }
  });

  app.patch("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get existing comment to check ownership
      const existingComment = await storage.getComment(id);
      if (!existingComment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      
      // Check if user owns the comment
      const userIdentifiers = [
        userId, // user ID
        req.user.claims.email, // user email
        req.user.claims.firstName, // user first name
        req.user.claims.firstName || req.user.claims.email // fallback logic used in comment creation
      ].filter(Boolean); // remove any undefined/null values
      
      if (!userIdentifiers.includes(existingComment.authorUsername)) {
        return res.status(403).json({ error: "Not authorized to edit this comment" });
      }
      
      const comment = await storage.updateComment(id, req.body);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get existing comment to check ownership
      const existingComment = await storage.getComment(id);
      if (!existingComment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      
      // Check if user owns the comment
      const userIdentifiers = [
        userId, // user ID
        req.user.claims.email, // user email
        req.user.claims.firstName, // user first name
        req.user.claims.firstName || req.user.claims.email // fallback logic used in comment creation
      ].filter(Boolean); // remove any undefined/null values
      
      console.log("Comment authorUsername:", existingComment.authorUsername);
      console.log("User identifiers:", userIdentifiers);
      
      if (!userIdentifiers.includes(existingComment.authorUsername)) {
        return res.status(403).json({ error: "Not authorized to delete this comment" });
      }
      
      // Soft delete - mark as deleted instead of actually deleting
      const deletedComment = await storage.updateComment(id, { 
        content: "Comment deleted by user",
        deletedAt: new Date()
      });
      
      if (!deletedComment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      
      res.json(deletedComment);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Check if user has commented on a post
  app.get("/api/comments/user-commented/:postId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = parseInt(req.params.postId);
      
      const hasCommented = await storage.hasUserCommentedOnPost(userId, postId);
      res.json({ hasCommented });
    } catch (error) {
      res.status(500).json({ error: "Failed to check user comment status" });
    }
  });

  // Votes
  app.get("/api/votes/user/:postId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = parseInt(req.params.postId);
      
      const vote = await storage.getVote(userId, postId);
      res.json(vote);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user vote" });
    }
  });

  app.post("/api/votes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { postId, commentId, voteType } = req.body;
      
      // Check if user already voted
      const existingVote = await storage.getVote(
        userId,
        postId || undefined,
        commentId || undefined
      );

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Same vote - remove it
          await storage.deleteVote(existingVote.id);
          res.status(204).send();
        } else {
          // Different vote - update it
          const updatedVote = await storage.updateVote(existingVote.id, voteType);
          res.json(updatedVote);
        }
      } else {
        // New vote
        const vote = await storage.createVote({
          userId,
          postId,
          commentId,
          voteType,
        });
        res.status(201).json(vote);
      }
    } catch (error) {
      res.status(400).json({ error: "Invalid vote data" });
    }
  });

  // Saved Posts routes
  app.get("/api/saved-posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const savedPosts = await storage.getSavedPosts(userId);
      res.json(savedPosts);
    } catch (error) {
      console.error("Error fetching saved posts:", error);
      res.status(500).json({ error: "Failed to fetch saved posts" });
    }
  });

  app.get("/api/saved-posts/:postId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = parseInt(req.params.postId);
      const savedPost = await storage.getSavedPost(userId, postId);
      if (!savedPost) {
        return res.status(200).json(null);
      }
      res.json(savedPost);
    } catch (error) {
      console.error("Error checking saved post:", error);
      res.status(500).json({ error: "Failed to check saved post" });
    }
  });

  app.post("/api/saved-posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { postId } = req.body;
      
      // Check if already saved
      const existingSavedPost = await storage.getSavedPost(userId, postId);
      if (existingSavedPost) {
        // If already saved, unsave it
        await storage.unsavePost(userId, postId);
        res.status(204).send();
      } else {
        // Save the post
        const savedPost = await storage.savePost({ userId, postId });
        res.status(201).json(savedPost);
      }
    } catch (error) {
      console.error("Error saving/unsaving post:", error);
      res.status(400).json({ error: "Failed to save/unsave post" });
    }
  });

  app.delete("/api/saved-posts/:postId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = parseInt(req.params.postId);
      
      const deleted = await storage.unsavePost(userId, postId);
      if (!deleted) {
        return res.status(404).json({ error: "Saved post not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error unsaving post:", error);
      res.status(500).json({ error: "Failed to unsave post" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

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
      const { subredditId, sortBy, search } = req.query;
      
      if (search) {
        const posts = await storage.searchPosts(search as string);
        res.json(posts);
      } else {
        const posts = await storage.getPosts(
          subredditId ? parseInt(subredditId as string) : undefined,
          sortBy as string
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

  app.patch("/api/comments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const comment = await storage.updateComment(id, req.body);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteComment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Votes
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

  const httpServer = createServer(app);
  return httpServer;
}

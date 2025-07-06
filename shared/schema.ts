import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subreddits = pgTable("subreddits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  memberCount: integer("member_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  authorUsername: text("author_username").notNull(),
  subredditId: integer("subreddit_id").references(() => subreddits.id),
  votes: integer("votes").default(0),
  commentCount: integer("comment_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorUsername: text("author_username").notNull(),
  postId: integer("post_id").references(() => posts.id),
  parentId: integer("parent_id"),
  votes: integer("votes").default(0),
  depth: integer("depth").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  postId: integer("post_id").references(() => posts.id),
  commentId: integer("comment_id").references(() => comments.id),
  voteType: integer("vote_type").notNull(), // 1 for upvote, -1 for downvote
});

export const savedPosts = pgTable("saved_posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userPostUnique: unique().on(table.userId, table.postId),
}));

export const insertSubredditSchema = createInsertSchema(subreddits).omit({
  id: true,
  memberCount: true,
  createdAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  votes: true,
  commentCount: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  votes: true,
  depth: true,
  createdAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
});

export const insertSavedPostSchema = createInsertSchema(savedPosts).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertSubreddit = z.infer<typeof insertSubredditSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type InsertSavedPost = z.infer<typeof insertSavedPostSchema>;

export type Subreddit = typeof subreddits.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type SavedPost = typeof savedPosts.$inferSelect;

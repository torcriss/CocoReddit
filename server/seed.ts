import { db } from "./db";
import { subreddits, posts } from "@shared/schema";

export async function seedDatabase() {
  try {
    // Check if data already exists
    const existingSubreddits = await db.select().from(subreddits);
    if (existingSubreddits.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    console.log("Seeding database...");

    // Insert default subreddits
    const defaultSubreddits = [
      { name: "webdev", description: "Web development discussions", memberCount: 2100000 },
      { name: "programming", description: "Programming topics and tutorials", memberCount: 4200000 },
      { name: "askreddit", description: "Ask and answer questions", memberCount: 34200000 },
    ];

    const insertedSubreddits = await db
      .insert(subreddits)
      .values(defaultSubreddits)
      .returning();

    // Insert sample posts
    const samplePosts = [
      {
        title: "Welcome to your personal Reddit clone!",
        content: "This is your personal space for organizing thoughts, ideas, and discussions. Feel free to create posts, comment, and organize content in subreddits.",
        authorUsername: "admin",
        subredditId: insertedSubreddits[0].id,
      },
      {
        title: "How to use the share feature",
        content: "Click the share button on any post to share it via social media, email, or copy the link to clipboard. Perfect for sharing interesting content with friends!",
        authorUsername: "admin",
        subredditId: insertedSubreddits[0].id,
      },
      {
        title: "Ask Me Anything: Building this Reddit clone",
        content: "I built this Reddit-like platform using React, Node.js, and PostgreSQL. Ask me anything about the development process!",
        authorUsername: "developer",
        subredditId: insertedSubreddits[1].id,
      }
    ];

    await db.insert(posts).values(samplePosts);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
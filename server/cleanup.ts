import { db } from "./db";
import { posts, comments, votes, savedPosts } from "@shared/schema";

export async function cleanupDatabase() {
  try {
    console.log("Starting database cleanup...");
    
    // Delete in order to respect foreign key constraints
    await db.delete(savedPosts);
    console.log("✓ Cleared saved posts");
    
    await db.delete(votes);
    console.log("✓ Cleared votes");
    
    await db.delete(comments);
    console.log("✓ Cleared comments");
    
    await db.delete(posts);
    console.log("✓ Cleared posts");
    
    console.log("Database cleanup completed successfully!");
    
  } catch (error) {
    console.error("Error during database cleanup:", error);
    throw error;
  }
}
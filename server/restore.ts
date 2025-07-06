import { db } from "./db";
import { posts, comments, votes } from "@shared/schema";

export async function restoreData() {
  try {
    console.log("Restoring sample data...");

    // Insert sample posts
    const samplePosts = [
      {
        title: "Welcome to your personal Reddit clone!",
        content: "This is your personal space for organizing thoughts, ideas, and discussions. Feel free to create posts, comment, and organize content in subreddits.",
        authorUsername: "admin",
        subredditId: 1, // webdev
        votes: 15,
      },
      {
        title: "How to use the share feature",
        content: "Click the share button on any post to share it via social media, email, or copy the link to clipboard. Perfect for sharing interesting content with friends!",
        authorUsername: "admin",
        subredditId: 1, // webdev
        votes: 8,
      },
      {
        title: "Ask Me Anything: Building this Reddit clone",
        content: "I built this Reddit-like platform using React, Node.js, and PostgreSQL. Ask me anything about the development process!",
        authorUsername: "developer",
        subredditId: 2, // programming
        votes: 23,
      },
      {
        title: "What's your favorite programming language and why?",
        content: "I'm curious to hear what programming languages people prefer for different types of projects. Share your thoughts!",
        authorUsername: "coder123",
        subredditId: 2, // programming
        votes: 12,
      },
      {
        title: "Best practices for React development",
        content: "Here are some tips I've learned over the years working with React. Always use functional components with hooks, keep components small and focused, and don't forget to optimize with useMemo and useCallback when needed.",
        authorUsername: "reactdev",
        subredditId: 1, // webdev
        votes: 31,
      },
      {
        title: "What's the most interesting project you've worked on?",
        content: "I'd love to hear about the projects that have excited you the most during your career or studies.",
        authorUsername: "curious_dev",
        subredditId: 3, // askreddit
        votes: 7,
      }
    ];

    const insertedPosts = await db.insert(posts).values(samplePosts).returning();

    // Add some sample comments
    const sampleComments = [
      {
        content: "Great question! I've been really enjoying TypeScript lately for its type safety.",
        authorUsername: "typefan",
        postId: insertedPosts[3].id, // What's your favorite programming language
        votes: 5,
      },
      {
        content: "Python is my go-to for data science projects, but JavaScript for web development.",
        authorUsername: "datadev",
        postId: insertedPosts[3].id,
        votes: 3,
      },
      {
        content: "Thanks for these tips! The useMemo advice is particularly helpful.",
        authorUsername: "learner",
        postId: insertedPosts[4].id, // Best practices for React
        votes: 2,
      },
      {
        content: "I built a real-time chat application that processes thousands of messages per second. The scalability challenges were fascinating!",
        authorUsername: "backend_expert",
        postId: insertedPosts[5].id, // Most interesting project
        votes: 8,
      },
      {
        content: "This platform looks amazing! Great work on the UI design.",
        authorUsername: "ui_enthusiast",
        postId: insertedPosts[2].id, // Ask Me Anything
        votes: 4,
      }
    ];

    const insertedComments = await db.insert(comments).values(sampleComments).returning();

    // Add some sample votes to make it more realistic
    const sampleVotes = [
      { userId: "44641157", postId: insertedPosts[0].id, voteType: 1 },
      { userId: "44641157", postId: insertedPosts[2].id, voteType: 1 },
      { userId: "44641157", postId: insertedPosts[4].id, voteType: 1 },
      { userId: "44641157", commentId: insertedComments[3].id, voteType: 1 },
    ];

    await db.insert(votes).values(sampleVotes);

    console.log(`✓ Restored ${insertedPosts.length} posts`);
    console.log(`✓ Restored ${insertedComments.length} comments`);
    console.log(`✓ Restored ${sampleVotes.length} votes`);
    console.log("Data restoration completed successfully!");
    
  } catch (error) {
    console.error("Error restoring data:", error);
    throw error;
  }
}
import { db } from "./db";
import { posts, comments, votes, subreddits } from "@shared/schema";
import { eq } from "drizzle-orm";

// Sample data arrays for generating realistic content
const postTitles = [
  "What's your favorite programming language and why?",
  "Best practices for React development in 2025",
  "How to optimize database queries for better performance",
  "The future of AI in web development",
  "Building scalable microservices architecture",
  "CSS Grid vs Flexbox: When to use which?",
  "Understanding TypeScript generics with practical examples",
  "Docker containers vs virtual machines comparison",
  "REST vs GraphQL: Which API design is better?",
  "Modern JavaScript features you should know",
  "Database design patterns for social media apps",
  "Security best practices for web applications",
  "Performance optimization techniques for React apps",
  "Introduction to serverless computing",
  "Git workflow strategies for team development",
  "Testing strategies: Unit vs Integration vs E2E",
  "Cloud deployment options comparison",
  "Mobile-first responsive design principles",
  "API rate limiting and caching strategies",
  "Code review best practices for teams",
  "Debugging techniques for complex applications",
  "State management in modern web apps",
  "Accessibility guidelines for web development",
  "Continuous integration and deployment pipelines",
  "Database indexing strategies for performance",
  "Error handling patterns in distributed systems",
  "Authentication and authorization best practices",
  "Monitoring and logging in production applications",
  "Design patterns every developer should know",
  "Web performance metrics that matter"
];

const postContents = [
  "I've been working with various languages over the years and wanted to get the community's perspective on their favorites.",
  "After years of React development, I've compiled a list of practices that have significantly improved my productivity.",
  "Database performance can make or break an application. Here are some techniques I've learned.",
  "AI is transforming how we build applications. What are your thoughts on the current trends?",
  "Microservices can be powerful but also complex. Here's what I've learned about building them right.",
  "The eternal debate continues. Both have their place, but when should you use each?",
  "Generics in TypeScript can be confusing at first. Let me break them down with real examples.",
  "Containerization has changed deployment strategies. Here's a comparison of the main approaches.",
  "API design is crucial for modern applications. Both approaches have merit.",
  "JavaScript continues to evolve rapidly. These features can improve your code quality.",
  "Social media apps have unique database requirements. Here are some patterns that work well.",
  "Security should be built in from the start. These practices can help protect your applications.",
  "React apps can become slow without proper optimization. Here are proven techniques.",
  "Serverless computing is changing how we think about infrastructure.",
  "Good Git workflows can make team development much smoother.",
  "Testing is essential but choosing the right strategy can be challenging.",
  "Cloud platforms offer many deployment options. Here's how to choose.",
  "Mobile users are the majority now. Design with them in mind first.",
  "APIs need protection from abuse. Rate limiting and caching are essential.",
  "Code reviews improve quality and knowledge sharing. Here's how to do them well.",
  "Complex bugs require systematic approaches. These techniques have served me well.",
  "State management choices can impact your entire application architecture.",
  "Accessible apps serve everyone better. These guidelines are a good starting point.",
  "Automation saves time and reduces errors. Here's how to set up effective pipelines.",
  "Proper indexing can dramatically improve query performance.",
  "Distributed systems introduce new categories of errors. Here's how to handle them.",
  "Security is paramount in modern applications. These patterns provide good foundations.",
  "You can't improve what you don't measure. These tools help with observability.",
  "Design patterns provide tested solutions to common problems.",
  "Performance affects user experience directly. Focus on these key metrics."
];

const commentTexts = [
  "Great point! I hadn't considered that perspective before.",
  "Thanks for sharing this. Very helpful explanation.",
  "I disagree with some points, but overall a solid article.",
  "This matches my experience exactly. Well written!",
  "Could you elaborate on the performance implications?",
  "Have you tried the alternative approach mentioned in the docs?",
  "This is exactly what I was looking for. Thank you!",
  "Interesting take. I'll have to try this in my next project.",
  "The examples really help clarify the concepts.",
  "I've seen this pattern work well in production environments.",
  "One thing to consider is the maintenance overhead.",
  "This approach has some security considerations to keep in mind.",
  "Great tutorial! The step-by-step format is very clear.",
  "I wonder how this scales with larger datasets?",
  "The code examples are particularly helpful.",
  "This reminds me of a similar pattern I used recently.",
  "Have you benchmarked this against other solutions?",
  "The trade-offs section is especially valuable.",
  "I implemented something similar and ran into edge cases.",
  "This explains a lot of issues I've been having.",
  "The documentation could use more examples like this.",
  "I'm bookmarking this for future reference.",
  "The community examples in the comments are gold.",
  "This pattern has saved me hours of debugging.",
  "The performance improvements are impressive.",
  "I'd love to see this expanded into a full series.",
  "The practical examples make this much easier to understand.",
  "This approach solved a major pain point for our team.",
  "I appreciate the balanced view of pros and cons.",
  "The real-world context makes this much more valuable."
];

const authors = [
  "Alex", "Sam", "Jordan", "Casey", "Taylor", "Morgan", "Avery", "Riley", 
  "Quinn", "Sage", "Cameron", "Rowan", "Blake", "Emery", "Finley", "Hayden",
  "Jamie", "Kendall", "Lane", "Micah", "Nico", "Parker", "Reese", "Skylar",
  "Tatum", "Val", "Wren", "Ari", "Bryce", "Cleo", "Dev", "Echo", "Frost",
  "Gray", "Haven", "Indigo", "Jules", "Kit", "Lux", "Max", "Nova", "Onyx",
  "Phoenix", "Quest", "Rain", "Storm", "True", "Unity", "Vega", "Wave", "Zara"
];

export async function loadTestData() {
  console.log("Loading test data...");
  
  try {
    // Get existing subreddit IDs
    const existingSubreddits = await db.select().from(subreddits);
    const subredditIds = existingSubreddits.map(s => s.id);
    
    if (subredditIds.length === 0) {
      throw new Error("No subreddits found. Please ensure subreddits exist before loading test data.");
    }

    console.log(`Found ${subredditIds.length} subreddits to use for posts`);

    // Generate 3000 posts
    console.log("Generating 3000 posts...");
    const postsToInsert = [];
    
    for (let i = 0; i < 3000; i++) {
      const titleIndex = Math.floor(Math.random() * postTitles.length);
      const contentIndex = Math.floor(Math.random() * postContents.length);
      const authorIndex = Math.floor(Math.random() * authors.length);
      const subredditIndex = Math.floor(Math.random() * subredditIds.length);
      
      // Add some variation to titles to make them unique
      const baseTitle = postTitles[titleIndex];
      const title = i < postTitles.length ? baseTitle : `${baseTitle} (Part ${Math.floor(i / postTitles.length) + 1})`;
      
      // Random creation time in the last 30 days
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      postsToInsert.push({
        title,
        content: postContents[contentIndex],
        authorUsername: authors[authorIndex],
        subredditId: subredditIds[subredditIndex],
        votes: Math.floor(Math.random() * 100) - 10, // -10 to 89 votes
        commentCount: 0, // Will be updated after comments are created
        createdAt,
        updatedAt: createdAt
      });
    }

    // Insert posts in batches
    const batchSize = 100;
    const insertedPosts = [];
    
    for (let i = 0; i < postsToInsert.length; i += batchSize) {
      const batch = postsToInsert.slice(i, i + batchSize);
      const result = await db.insert(posts).values(batch).returning();
      insertedPosts.push(...result);
      
      if ((i + batchSize) % 500 === 0 || i + batchSize >= postsToInsert.length) {
        console.log(`Inserted ${Math.min(i + batchSize, postsToInsert.length)} posts...`);
      }
    }

    console.log(`Successfully created ${insertedPosts.length} posts`);

    // Generate 1000 comments
    console.log("Generating 1000 comments...");
    const commentsToInsert = [];
    
    for (let i = 0; i < 1000; i++) {
      const textIndex = Math.floor(Math.random() * commentTexts.length);
      const authorIndex = Math.floor(Math.random() * authors.length);
      const postIndex = Math.floor(Math.random() * insertedPosts.length);
      
      // Random creation time after the post was created
      const post = insertedPosts[postIndex];
      const minTime = new Date(post.createdAt).getTime();
      const maxTime = Date.now();
      const createdAt = new Date(minTime + Math.random() * (maxTime - minTime));
      
      commentsToInsert.push({
        content: commentTexts[textIndex],
        authorUsername: authors[authorIndex],
        postId: post.id,
        votes: Math.floor(Math.random() * 50) - 5, // -5 to 44 votes
        depth: 0, // All top-level comments for simplicity
        createdAt,
        updatedAt: createdAt
      });
    }

    // Insert comments in batches
    const insertedComments = [];
    
    for (let i = 0; i < commentsToInsert.length; i += batchSize) {
      const batch = commentsToInsert.slice(i, i + batchSize);
      const result = await db.insert(comments).values(batch).returning();
      insertedComments.push(...result);
      
      if ((i + batchSize) % 200 === 0 || i + batchSize >= commentsToInsert.length) {
        console.log(`Inserted ${Math.min(i + batchSize, commentsToInsert.length)} comments...`);
      }
    }

    console.log(`Successfully created ${insertedComments.length} comments`);

    // Update comment counts for posts
    console.log("Updating post comment counts...");
    const commentCounts = new Map();
    insertedComments.forEach(comment => {
      commentCounts.set(comment.postId, (commentCounts.get(comment.postId) || 0) + 1);
    });

    for (const [postId, count] of commentCounts.entries()) {
      await db.update(posts).set({ commentCount: count }).where(eq(posts.id, postId));
    }

    // Generate 1000 votes
    console.log("Generating 1000 votes...");
    const votesToInsert = [];
    const usedVoteCombinations = new Set();
    
    let votesCreated = 0;
    let attempts = 0;
    const maxAttempts = 2000; // Prevent infinite loop
    
    while (votesCreated < 1000 && attempts < maxAttempts) {
      attempts++;
      
      const authorIndex = Math.floor(Math.random() * authors.length);
      const voteType = Math.random() > 0.3 ? 1 : -1; // 70% upvotes, 30% downvotes
      
      // 70% post votes, 30% comment votes
      const isPostVote = Math.random() > 0.3;
      
      let voteKey;
      let vote;
      
      if (isPostVote) {
        const postIndex = Math.floor(Math.random() * insertedPosts.length);
        const post = insertedPosts[postIndex];
        voteKey = `${authors[authorIndex]}-post-${post.id}`;
        
        if (!usedVoteCombinations.has(voteKey)) {
          vote = {
            userId: authors[authorIndex],
            postId: post.id,
            voteType,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      } else {
        const commentIndex = Math.floor(Math.random() * insertedComments.length);
        const comment = insertedComments[commentIndex];
        voteKey = `${authors[authorIndex]}-comment-${comment.id}`;
        
        if (!usedVoteCombinations.has(voteKey)) {
          vote = {
            userId: authors[authorIndex],
            commentId: comment.id,
            voteType,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      }
      
      if (vote && !usedVoteCombinations.has(voteKey)) {
        usedVoteCombinations.add(voteKey);
        votesToInsert.push(vote);
        votesCreated++;
      }
    }

    // Insert votes in batches
    for (let i = 0; i < votesToInsert.length; i += batchSize) {
      const batch = votesToInsert.slice(i, i + batchSize);
      await db.insert(votes).values(batch);
      
      if ((i + batchSize) % 200 === 0 || i + batchSize >= votesToInsert.length) {
        console.log(`Inserted ${Math.min(i + batchSize, votesToInsert.length)} votes...`);
      }
    }

    console.log(`Successfully created ${votesToInsert.length} votes`);
    
    console.log("Test data loading completed successfully!");
    console.log(`Summary:
    - Posts: ${insertedPosts.length}
    - Comments: ${insertedComments.length}
    - Votes: ${votesToInsert.length}`);
    
    return {
      posts: insertedPosts.length,
      comments: insertedComments.length,
      votes: votesToInsert.length
    };
    
  } catch (error) {
    console.error("Error loading test data:", error);
    throw error;
  }
}
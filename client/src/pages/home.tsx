import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, User, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import type { Post, Comment } from "@shared/schema";

export default function Home() {
  const [sortBy, setSortBy] = useState("hot");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"home" | "popular">("home");
  const [selectedSubreddit, setSelectedSubreddit] = useState<number | null>(null);

  const [showUserPosts, setShowUserPosts] = useState(false);
  const [showUserComments, setShowUserComments] = useState(false);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: allPosts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts?sortBy=hot");
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
  });

  // Client-side filtering and sorting to prevent dynamic reloading
  const filteredAndSortedPosts = (() => {
    let posts = [...allPosts];
    
    // Apply search filter
    if (searchQuery) {
      posts = posts.filter((post: Post) => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.content && post.content.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply subreddit filter
    if (selectedSubreddit) {
      posts = posts.filter((post: Post) => post.subredditId === selectedSubreddit);
    }
    
    // Apply user posts filter
    if (showUserPosts && user) {
      const userIdentifier = user.firstName || user.email || "anonymous";
      posts = posts.filter((post: Post) => {
        return post.authorUsername === userIdentifier || 
               post.authorUsername === user.firstName ||
               post.authorUsername === user.email ||
               post.authorUsername === (user.firstName || user.email);
      });
    }
    
    // Apply sorting
    switch (sortBy) {
      case "new":
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "top":
        posts.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        break;
      case "hot":
      default:
        // Hot algorithm: combine votes and time
        posts.sort((a, b) => {
          const aScore = (a.votes || 0) + (Math.max(0, 24 - ((Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60))) * 0.1);
          const bScore = (b.votes || 0) + (Math.max(0, 24 - ((Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60))) * 0.1);
          return bScore - aScore;
        });
        break;
    }
    
    // In popular mode, show only posts with high votes
    if (viewMode === "popular") {
      posts = posts.filter((post: Post) => (post.votes || 0) >= 1);
    }
    
    return posts;
  })();

  // Get all subreddits to find the selected one
  const { data: subreddits = [] } = useQuery({
    queryKey: ["/api/subreddits"],
  });

  // Get user comments when showing user comments
  const { data: userCommentsData = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments/user"],
    queryFn: async () => {
      if (!showUserComments || !user) return [];
      
      // Fetch comments from all posts and filter by user
      const response = await fetch("/api/posts");
      if (!response.ok) return [];
      const allPosts = await response.json();
      
      const commentPromises = allPosts.map(async (post: Post) => {
        const response = await fetch(`/api/posts/${post.id}/comments`);
        if (!response.ok) return [];
        const comments = await response.json();
        return comments.map((comment: Comment) => ({ ...comment, postTitle: post.title, postId: post.id }));
      });
      
      const commentArrays = await Promise.all(commentPromises);
      const allComments = commentArrays.flat();
      
      const userIdentifier = user.firstName || user.email || "anonymous";
      return allComments.filter((comment: any) => {
        return comment.authorUsername === userIdentifier || 
               comment.authorUsername === user.firstName ||
               comment.authorUsername === user.email ||
               comment.authorUsername === (user.firstName || user.email);
      });
    },
    enabled: showUserComments && !!user,
  });

  // Find the selected subreddit from the list
  const selectedSubredditData = selectedSubreddit 
    ? subreddits.find(s => s.id === selectedSubreddit)
    : null;

  const handleShowUserPosts = () => {
    setShowUserPosts(true);
    setShowUserComments(false);
    setSelectedSubreddit(null); // Clear subreddit filter when showing user posts
    setViewMode("home"); // Reset view mode
  };

  const handleShowUserComments = () => {
    setShowUserComments(true);
    setShowUserPosts(false);
    setSelectedSubreddit(null); // Clear subreddit filter when showing user comments
    setViewMode("home"); // Reset view mode
  };

  const handleViewModeChange = (mode: "home" | "popular") => {
    setViewMode(mode);
    // Reset user-specific views when changing view mode
    setShowUserPosts(false);
    setShowUserComments(false);
    setSelectedSubreddit(null);
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-reddit-dark">
      <Header 
        onSearch={setSearchQuery} 
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Context Headers - Only show when specific conditions are met */}
            {(viewMode === "popular" || selectedSubreddit || showUserPosts || showUserComments) && (
              <div className="bg-white dark:bg-reddit-darker rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                {viewMode === "popular" && (
                  <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-reddit-orange" />
                      <span>Popular Posts</span>
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Showing the most upvoted posts across all communities
                    </p>
                  </div>
                )}
                
                {selectedSubreddit && selectedSubredditData && (
                  <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-reddit-blue rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {selectedSubredditData.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            r/{selectedSubredditData.name}
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedSubredditData.description || "Community posts"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSubreddit(null)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-gray-300 hover:border-gray-400"
                      >
                        View All Posts
                      </Button>
                    </div>
                  </div>
                )}

                {showUserPosts && user && (
                  <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            My Posts
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Posts created by you
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUserPosts(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-gray-300 hover:border-gray-400"
                      >
                        View All Posts
                      </Button>
                    </div>
                  </div>
                )}

                {showUserComments && user && (
                  <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            My Comments
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Comments created by you
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUserComments(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-gray-300 hover:border-gray-400"
                      >
                        View All Posts
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Posts or Comments */}
            {showUserComments ? (
              <div className="space-y-4">
                {userCommentsData.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 dark:text-gray-400">
                      You haven't made any comments yet.
                    </div>
                  </div>
                ) : (
                  userCommentsData.map((comment: any) => (
                    <Card key={comment.id} className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
                      <div className="p-4">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <span>Comment on</span>
                          <span 
                            className="mx-1 font-medium text-reddit-blue cursor-pointer hover:underline"
                            onClick={() => setLocation(`/post/${comment.postId}`)}
                          >
                            {comment.postTitle}
                          </span>
                          <span className="mx-1">•</span>
                          <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300">
                          {comment.content}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8 col-span-full">
                    <div className="text-gray-500 dark:text-gray-400">Loading posts...</div>
                  </div>
                ) : filteredAndSortedPosts.length === 0 ? (
                  <div className="text-center py-8 col-span-full">
                    <div className="text-gray-500 dark:text-gray-400">
                      {searchQuery ? "No posts found matching your search." : "No posts yet. Be the first to create one!"}
                    </div>
                  </div>
                ) : (
                  filteredAndSortedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}
              </div>
            )}
          </main>

          {/* Sidebar */}
          <Sidebar 
            selectedSubreddit={selectedSubreddit}
            onSubredditSelect={setSelectedSubreddit}
            onShowUserPosts={handleShowUserPosts}
            onShowUserComments={handleShowUserComments}
          />
        </div>
      </div>
    </div>
  );
}

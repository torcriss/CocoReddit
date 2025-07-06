import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Clock, TrendingUp, LayoutGrid, List, User, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import type { Post, Comment } from "@shared/schema";

export default function Home() {
  const [sortBy, setSortBy] = useState("hot");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"home" | "popular">("home");
  const [selectedSubreddit, setSelectedSubreddit] = useState<number | null>(null);
  const [layoutMode, setLayoutMode] = useState<"list" | "grid">("list");
  const [showUserPosts, setShowUserPosts] = useState(false);
  const [showUserComments, setShowUserComments] = useState(false);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts", { sortBy, search: searchQuery, viewMode, subredditId: selectedSubreddit, showUserPosts }],
    queryFn: async () => {
      const params = new URLSearchParams();
      // In popular mode, force "top" sorting and show all posts
      const effectiveSort = viewMode === "popular" ? "top" : sortBy;
      params.append("sortBy", effectiveSort);
      if (searchQuery) params.append("search", searchQuery);
      if (selectedSubreddit) params.append("subredditId", selectedSubreddit.toString());
      
      const response = await fetch(`/api/posts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const allPosts = await response.json();
      
      // Filter by user posts if showUserPosts is true
      if (showUserPosts && user) {
        console.log("Current user object:", user);
        const userIdentifier = user.firstName || user.email || "anonymous";
        console.log("Filtering posts for user:", userIdentifier);
        console.log("Available posts:", allPosts.map(p => ({ id: p.id, title: p.title, author: p.authorUsername })));
        
        // Try multiple possible matches since posts might be created with different identifiers
        const filteredPosts = allPosts.filter((post: Post) => {
          return post.authorUsername === userIdentifier || 
                 post.authorUsername === user.firstName ||
                 post.authorUsername === user.email ||
                 post.authorUsername === (user.firstName || user.email);
        });
        
        console.log("Filtered posts:", filteredPosts);
        return filteredPosts;
      }
      
      return allPosts;
    },
  });

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

  const sortOptions = [
    { key: "hot", label: "Hot", icon: Flame },
    { key: "new", label: "New", icon: Clock },
    { key: "top", label: "Top", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-reddit-dark">
      <Header 
        onSearch={setSearchQuery} 
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Sort Options */}
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
              <div className="flex items-center justify-between">
                {/* Hide sort options when viewing user-specific content */}
                {!showUserPosts && !showUserComments && (
                  <div className="flex items-center space-x-4">
                    {/* In popular mode, disable sort options and show only "Top" */}
                    {viewMode === "popular" ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex items-center space-x-2 bg-reddit-blue text-white hover:bg-reddit-blue/90"
                      >
                        <TrendingUp className="h-4 w-4" />
                        <span>Top</span>
                      </Button>
                    ) : (
                      sortOptions.map(({ key, label, icon: Icon }) => (
                        <Button
                          key={key}
                          variant={sortBy === key ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSortBy(key)}
                          className={`flex items-center space-x-2 ${
                            sortBy === key 
                              ? "bg-reddit-blue text-white hover:bg-reddit-blue/90" 
                              : "text-gray-700 dark:text-gray-300 hover:text-reddit-blue"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </Button>
                      ))
                    )}
                  </div>
                )}
                
                {/* Layout controls - show for posts, hide for comments */}
                {!showUserComments && (
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={layoutMode === "list" ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => setLayoutMode("list")}
                      className={layoutMode === "list" ? "bg-reddit-blue text-white hover:bg-reddit-blue/90" : ""}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={layoutMode === "grid" ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => setLayoutMode("grid")}
                      className={layoutMode === "grid" ? "bg-reddit-blue text-white hover:bg-reddit-blue/90" : ""}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

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
              <div className={layoutMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
                : "space-y-4"
              }>
                {isLoading ? (
                  <div className="text-center py-8 col-span-full">
                    <div className="text-gray-500 dark:text-gray-400">Loading posts...</div>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-8 col-span-full">
                    <div className="text-gray-500 dark:text-gray-400">
                      {searchQuery ? "No posts found matching your search." : "No posts yet. Be the first to create one!"}
                    </div>
                  </div>
                ) : (
                  posts.map((post) => (
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

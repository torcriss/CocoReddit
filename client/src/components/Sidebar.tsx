import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, ChevronUp, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Subreddit, Post } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  selectedSubreddit?: number | null;
  onSubredditSelect?: (subredditId: number | null) => void;
}

export default function Sidebar({ selectedSubreddit, onSubredditSelect }: SidebarProps) {
  const [, setLocation] = useLocation();
  const [visitedPostIds, setVisitedPostIds] = useState<number[]>([]);
  const [displayCount, setDisplayCount] = useState(10); // Start with 10 posts
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: subreddits = [] } = useQuery<Subreddit[]>({
    queryKey: ["/api/subreddits"],
  });

  // Get all posts for recent posts section
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  // Get visited posts specifically
  const { data: visitedPosts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts/visited", visitedPostIds],
    queryFn: async () => {
      if (visitedPostIds.length === 0) return [];
      
      // Fetch each visited post individually
      const promises = visitedPostIds.map(async (id) => {
        try {
          const response = await fetch(`/api/posts/${id}`);
          if (response.ok) {
            return response.json();
          }
        } catch (error) {
          console.error(`Failed to fetch post ${id}:`, error);
        }
        return null;
      });
      
      const results = await Promise.all(promises);
      return results.filter(post => post !== null);
    },
    enabled: visitedPostIds.length > 0,
  });

  // Load visited posts from localStorage 
  useEffect(() => {
    const loadVisitedPosts = () => {
      const stored = localStorage.getItem('visitedPosts');
      if (stored) {
        try {
          const parsedIds = JSON.parse(stored);
          setVisitedPostIds(parsedIds);
        } catch {
          setVisitedPostIds([]);
        }
      } else {
        setVisitedPostIds([]);
      }
    };

    loadVisitedPosts();

    // Listen for localStorage changes (when posts are visited from other components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'visitedPosts') {
        loadVisitedPosts();
      }
    };

    // Listen for posts query changes to refresh visited posts
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === '/api/posts' && event.type === 'updated') {
        // Small delay to ensure localStorage is updated by post creation
        setTimeout(loadVisitedPosts, 100);
      }
    });

    // Listen for custom storage events
    const handleCustomStorageChange = () => {
      loadVisitedPosts();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('visitedPostsChanged', handleCustomStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('visitedPostsChanged', handleCustomStorageChange);
    };
  }, [queryClient]);

  // Get user's own posts and visited posts
  const userIdentifier = user?.firstName || user?.email || "anonymous";
  
  // User's own posts (sorted by creation date, newest first)
  const userPosts = posts
    .filter(post => post.authorUsername === userIdentifier)
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  
  // Visited posts (excluding user's own posts to avoid duplicates)
  const filteredVisitedPosts = visitedPosts
    .filter(post => post.authorUsername !== userIdentifier)
    .sort((a, b) => {
      // Sort by when they were visited (most recent first)
      const aIndex = visitedPostIds.indexOf(a.id);
      const bIndex = visitedPostIds.indexOf(b.id);
      return aIndex - bIndex;
    });
  
  // Combine: user's posts first, then visited posts
  const allRecentPosts = [...userPosts, ...filteredVisitedPosts];
  const recentPosts = allRecentPosts.slice(0, displayCount);
  const hasMorePosts = allRecentPosts.length > displayCount;
  


  const handlePostClick = (postId: number) => {
    // Add to visited posts and update localStorage
    const newVisitedIds = [postId, ...visitedPostIds.filter(id => id !== postId)];
    setVisitedPostIds(newVisitedIds);
    localStorage.setItem('visitedPosts', JSON.stringify(newVisitedIds));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('visitedPostsChanged'));
    
    setLocation(`/post/${postId}`);
  };

  // Infinite scroll functionality
  const loadMorePosts = useCallback(() => {
    if (isLoadingMore || !hasMorePosts) return;
    
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => prev + 10);
      setIsLoadingMore(false);
    }, 300); // Small delay to simulate loading
  }, [isLoadingMore, hasMorePosts]);

  // Scroll event handler with complete event isolation
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    e.stopPropagation();
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 50; // Load more when 50px from bottom
    
    if (scrollHeight - scrollTop <= clientHeight + threshold) {
      loadMorePosts();
    }
  }, [loadMorePosts]);

  // Wheel event handler to prevent scroll propagation at boundaries
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const { deltaY } = e;
    
    // Check if we're at the top and trying to scroll up
    if (scrollTop === 0 && deltaY < 0) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Check if we're at the bottom and trying to scroll down
    if (scrollTop + clientHeight >= scrollHeight && deltaY > 0) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Allow normal scrolling within bounds
    e.stopPropagation();
  }, []);

  const clearRecentPosts = () => {
    // Only clear visited posts, not user's own posts
    setVisitedPostIds([]);
    localStorage.removeItem('visitedPosts');
    setDisplayCount(10); // Reset display count
  };

  const communityColors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-red-500", "bg-yellow-500", "bg-pink-500", "bg-indigo-500"
  ];

  const formatTimeAgo = (date: Date | null) => {
    try {
      if (!date) return "just now";
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  const getSubredditName = (subredditId?: number | null) => {
    if (!subredditId) return "general";
    const subreddit = subreddits.find(s => s.id === subredditId);
    return subreddit?.name || "general";
  };

  return (
    <aside className="w-80 hidden lg:block">
      <div className="sticky top-20 space-y-4">
        {/* Recent Posts */}
        <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Recent Posts
              </CardTitle>
              {recentPosts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentPosts}
                  className="text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 h-8 w-8"
                  title="Clear recent posts"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              onWheel={handleWheel}
              className="space-y-3 overflow-y-auto max-h-[70vh] pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
            >
              {recentPosts.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No visited posts yet
                </div>
              ) : (
                recentPosts.map((post) => (
                  <div
                    key={`sidebar-recent-${post.id}`}
                    onClick={() => handlePostClick(post.id)}
                    className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-reddit-dark cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                          r/{getSubredditName(post.subredditId || undefined)}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
                          {post.title}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <ChevronUp className="h-3 w-3" />
                            <span>{Math.max(0, post.votes || 0)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{post.commentCount || 0}</span>
                          </div>
                          <span>•</span>
                          <span>{formatTimeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Loading indicator for infinite scroll */}
              {isLoadingMore && (
                <div className="text-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-400" />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Loading more posts...
                  </div>
                </div>
              )}
              
              {/* Show if there are more posts available */}
              {!isLoadingMore && hasMorePosts && recentPosts.length > 0 && (
                <div className="text-center py-2">
                  <div className="text-xs text-gray-400">
                    Scroll down for more posts
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
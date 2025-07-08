import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Trash2, Loader2 } from "lucide-react";
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
  const [isCleared, setIsCleared] = useState(false); // Track if user has cleared posts
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
      
      // Fetch each visited post individually, ensuring all IDs are valid numbers
      const validIds = visitedPostIds.filter(id => typeof id === 'number' && !isNaN(id));
      const promises = validIds.map(async (id) => {
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
          const parsedData = JSON.parse(stored);
          // Handle both old format (array of IDs) and new format (array of objects)
          let validIds: number[] = [];
          
          if (Array.isArray(parsedData)) {
            if (parsedData.length > 0) {
              if (typeof parsedData[0] === 'number') {
                // Old format: array of IDs
                validIds = parsedData.filter((id: any) => typeof id === 'number' && !isNaN(id));
              } else if (typeof parsedData[0] === 'object' && parsedData[0].id) {
                // New format: array of objects with id property
                validIds = parsedData
                  .filter((item: any) => item && typeof item.id === 'number' && !isNaN(item.id))
                  .map((item: any) => item.id);
              }
            }
          }
          
          setVisitedPostIds(validIds);
          console.log('Loaded visited post IDs:', validIds);
        } catch {
          setVisitedPostIds([]);
          localStorage.removeItem('visitedPosts');
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
  
  // If no visited posts yet and not cleared, show the latest posts from the platform
  const defaultRecentPosts = (visitedPostIds.length === 0 && !isCleared) ? posts.slice(0, 10) : [];
  
  // Combine: user's posts first, then visited posts, then default posts if needed
  const allRecentPosts = [...userPosts, ...filteredVisitedPosts, ...defaultRecentPosts];
  
  // Remove duplicates by post ID
  const uniqueRecentPosts = allRecentPosts.filter((post, index, array) => 
    array.findIndex(p => p.id === post.id) === index
  );
  
  const recentPosts = uniqueRecentPosts.slice(0, displayCount);
  const hasMorePosts = uniqueRecentPosts.length > displayCount;
  


  const handlePostClick = (postId: number) => {
    // Ensure postId is a valid number
    if (typeof postId !== 'number' || isNaN(postId)) {
      console.error('Invalid post ID:', postId);
      return;
    }
    
    // Reset cleared state when user clicks on a post
    setIsCleared(false);
    
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

  // Simple and effective wheel event handler
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const { deltaY } = e;
    
    // Calculate if we're at boundaries with small tolerance
    const atTop = scrollTop <= 2;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
    
    // Stop propagation for all wheel events within this container
    e.stopPropagation();
    
    // Only prevent default (and thus scrolling) when at boundaries
    if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
      e.preventDefault();
    }
  }, []);

  const clearRecentPosts = () => {
    console.log('Clear button clicked. visitedPostIds:', visitedPostIds);
    
    // Clear visited posts and set cleared state
    setVisitedPostIds([]);
    setIsCleared(true);
    localStorage.removeItem('visitedPosts');
    setDisplayCount(10); // Reset display count
    
    // Force refresh all relevant queries
    queryClient.invalidateQueries({ queryKey: ["/api/posts/visited"] });
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    
    // Trigger custom event for other components
    window.dispatchEvent(new CustomEvent('visitedPostsChanged'));
    
    console.log('Clear completed. Posts should now be hidden.');
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
    <aside className="w-80 hidden lg:block bg-gray-900 border-l border-gray-700 h-screen fixed right-0 top-0 z-10">
      <div className="pt-20 h-full flex flex-col">
        {/* Recent Posts Header */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              RECENT POSTS
            </h2>
            {recentPosts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecentPosts}
                className="text-gray-500 hover:text-red-400 hover:bg-red-900/20 p-1 h-6 w-6 text-xs"
                title={visitedPostIds.length > 0 ? "Clear visited posts" : "Clear recent posts"}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        {/* Recent Posts Content */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
          style={{ overscrollBehavior: 'contain' }}
        >
          {recentPosts.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8 px-4">
              {isCleared ? "Recent posts cleared" : "No posts available"}
            </div>
          ) : (
            <div className="space-y-0">
              {recentPosts.map((post) => (
                <div
                  key={`sidebar-recent-${post.id}`}
                  onClick={() => handlePostClick(post.id)}
                  className="p-3 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start space-x-3">
                    {/* User Avatar/Community Icon */}
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">
                        {getSubredditName(post.subredditId || undefined)?.charAt(0).toUpperCase() || 'C'}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Community and Time */}
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                        <span className="font-medium">
                          r/{getSubredditName(post.subredditId || undefined)}
                        </span>
                        <span>•</span>
                        <span>{formatTimeAgo(post.createdAt)}</span>
                      </div>
                      
                      {/* Post Title */}
                      <div className="text-sm text-white font-medium line-clamp-2 mb-2 group-hover:text-gray-100">
                        {post.title}
                      </div>
                      
                      {/* Engagement Stats */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{post.commentCount || 0} comments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Loading indicator for infinite scroll */}
          {isLoadingMore && (
            <div className="text-center py-4 px-4">
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-400" />
              <div className="text-xs text-gray-500 mt-2">
                Loading more posts...
              </div>
            </div>
          )}
          
          {/* Show if there are more posts available */}
          {!isLoadingMore && hasMorePosts && recentPosts.length > 0 && (
            <div className="text-center py-3 px-4">
              <div className="text-xs text-gray-500">
                Scroll down for more posts
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
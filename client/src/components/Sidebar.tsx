import { useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Post, Subreddit } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";

interface SidebarProps {
  selectedSubreddit?: number | null;
  onSubredditSelect?: (subredditId: number | null) => void;
}

export default function Sidebar({ selectedSubreddit, onSubredditSelect }: SidebarProps) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [displayCount, setDisplayCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get saved posts
  const { data: savedPosts = [] } = useQuery<Post[]>({
    queryKey: ["/api/saved-posts", "list", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch('/api/saved-posts');
      if (!response.ok) throw new Error('Failed to fetch saved posts');
      return response.json();
    },
    enabled: !!user?.id && isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Query to get subreddits for displaying community info
  const { data: subreddits = [] } = useQuery<Subreddit[]>({
    queryKey: ["/api/subreddits"],
    staleTime: 5 * 60 * 1000,
  });

  const handlePostClick = (postId: number) => {
    setLocation(`/post/${postId}`);
  };

  const loadMorePosts = () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    setDisplayCount(prev => prev + 10);
    
    setTimeout(() => {
      setIsLoadingMore(false);
    }, 500);
  };

  // Handle infinite scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.5;
    
    if (isNearBottom && !isLoadingMore && savedPosts.length > displayCount) {
      loadMorePosts();
    }
  };

  // Prevent scroll propagation
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;
    
    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      e.preventDefault();
    }
  };

  // Clear all saved posts mutation
  const clearSavedPostsMutation = useMutation({
    mutationFn: async () => {
      // Remove all saved posts one by one
      const promises = savedPosts.map(post => 
        apiRequest("DELETE", `/api/saved-posts/${post.id}`)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-posts"] });
      toast({
        title: "Success",
        description: "All saved posts have been cleared",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clear saved posts",
        variant: "destructive",
      });
    },
  });

  const handleClearSavedPosts = () => {
    if (savedPosts.length === 0) return;
    clearSavedPostsMutation.mutate();
  };

  const displayedSavedPosts = savedPosts.slice(0, displayCount);
  const hasMorePosts = savedPosts.length > displayCount;

  return (
    <div className="fixed right-0 top-14 w-80 bg-black text-white h-[calc(100vh-3.5rem)] flex flex-col border-l border-gray-800 z-10">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">SAVED POSTS</h2>
          {savedPosts.length > 0 && (
            <button
              onClick={handleClearSavedPosts}
              disabled={clearSavedPostsMutation.isPending}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
              title="Clear all saved posts"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Saved Posts List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
          style={{ overscrollBehavior: 'contain' }}
        >
          {!isAuthenticated ? (
            <div className="text-sm text-gray-500 text-center py-8 px-4">
              Log in to see your saved posts
            </div>
          ) : displayedSavedPosts.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8 px-4">
              No saved posts yet
            </div>
          ) : (
            <div className="space-y-0">
              {displayedSavedPosts.map((post) => {
                const subreddit = subreddits.find((s) => s.id === post.subredditId);
                
                return (
                  <div
                    key={`sidebar-saved-${post.id}`}
                    onClick={() => handlePostClick(post.id)}
                    className="p-3 border-b border-gray-800 hover:bg-gray-900 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Community Avatar */}
                      <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {subreddit?.name?.slice(0, 2).toUpperCase() || 'C'}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Community and metadata */}
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                          <span className="text-blue-400 hover:text-blue-300">
                            r/{subreddit?.name || 'community'}
                          </span>
                          <span>•</span>
                          <span>{post.authorUsername}</span>
                        </div>
                        
                        {/* Post title */}
                        <h3 className="text-sm font-medium text-white line-clamp-2 mb-1">
                          {post.title}
                        </h3>
                        
                        {/* Post metadata */}
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <span>{post.commentCount || 0} comments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Load more indicator */}
              {hasMorePosts && (
                <div className="p-4 text-center">
                  {isLoadingMore ? (
                    <div className="text-sm text-gray-400">Loading more posts...</div>
                  ) : (
                    <button
                      onClick={loadMorePosts}
                      className="text-sm text-orange-500 hover:text-orange-400"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
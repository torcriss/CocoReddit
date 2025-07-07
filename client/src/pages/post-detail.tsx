import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share, Bookmark, ChevronUp, ChevronDown, BookmarkPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import CommentThread from "@/components/CommentThread";

import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useSharedState } from "@/hooks/useSharedState";
import type { Post } from "@shared/schema";
import { useLocation } from "wouter";

export default function PostDetail() {
  const { id } = useParams();
  const [userVote, setUserVote] = useState<number | null>(null);
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const [cameFromProfile, setCameFromProfile] = useState<boolean>(false);

  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"home" | "popular">("home");
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { isShared, setSharedPost } = useSharedState();

  // Check if user came from profile page
  useEffect(() => {
    const fromProfile = localStorage.getItem('cameFromProfile');
    if (fromProfile === 'true') {
      setCameFromProfile(true);
      localStorage.removeItem('cameFromProfile'); // Clean up
    }
  }, []);

  // Handle comment focus from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#comment-')) {
      const commentId = hash.replace('#comment-', '');
      // Try multiple times in case comments are still loading
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryFocus = () => {
        const element = document.getElementById(`comment-${commentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
          }, 3000);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryFocus, 200); // Try again after 200ms
        }
      };
      
      // Initial delay to let page load
      setTimeout(tryFocus, 500);
    }
  }, [id]);

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/posts", id],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch post");
      return response.json();
    },
  });

  // Fetch subreddit information if post has a subredditId
  const { data: subreddit } = useQuery({
    queryKey: ["/api/subreddits", post?.subredditId],
    queryFn: async () => {
      if (!post?.subredditId) return null;
      try {
        const response = await fetch(`/api/subreddits/${post.subredditId}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        // Ignore error, just return null
      }
      return null;
    },
    enabled: !!post?.subredditId,
  });

  // Check if post is saved by the user
  const { data: isSaved } = useQuery({
    queryKey: ["/api/saved-posts", parseInt(id!)],
    queryFn: async () => {
      if (!isAuthenticated || !user) return false;
      try {
        const response = await fetch(`/api/saved-posts/${id}`);
        if (response.ok) {
          const savedPost = await response.json();
          return !!savedPost;
        }
      } catch (error) {
        // Ignore error, just return false
      }
      return false;
    },
    enabled: isAuthenticated && !!user && !!id,
  });

  // Reset optimistic saved state when saved data is updated
  useEffect(() => {
    if (isSaved !== undefined) {
      setOptimisticSaved(null);
    }
  }, [isSaved]);

  const voteMutation = useMutation({
    mutationFn: async (voteType: number) => {
      return apiRequest("POST", "/api/votes", {
        userId: "user", // Server will get user from session
        postId: parseInt(id!),
        voteType,
      });
    },
    onSuccess: () => {
      // Only invalidate the specific post, not the posts list to prevent reordering
      queryClient.invalidateQueries({ queryKey: ["/api/posts", id] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Login Required",
          description: "You need to login to vote on posts",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/saved-posts", {
        postId: parseInt(id!),
      });
    },
    onMutate: async () => {
      // Optimistic update
      const currentSaved = optimisticSaved !== null ? optimisticSaved : !!isSaved;
      setOptimisticSaved(!currentSaved);
      
      return { previousSaved: currentSaved };
    },
    onSuccess: () => {
      // Invalidate all related saved posts queries with consistent cache keys
      queryClient.invalidateQueries({ queryKey: ["/api/saved-posts", parseInt(id!)] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-posts"] });
      
      const currentSaved = optimisticSaved !== null ? optimisticSaved : !!isSaved;
      toast({
        title: currentSaved ? "Post saved" : "Post unsaved",
        description: currentSaved ? "Added to your saved posts" : "Removed from your saved posts",
      });
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update
      if (context?.previousSaved !== undefined) {
        setOptimisticSaved(context.previousSaved);
      }
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Login Required",
          description: "You need to login to save posts",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVote = (voteType: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "You need to login to vote on posts",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    const newVote = userVote === voteType ? null : voteType;
    setUserVote(newVote);
    if (newVote !== null) {
      voteMutation.mutate(newVote);
    }
  };

  const handleSave = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "You need to login to save posts",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    // Don't allow saving while mutation is pending
    if (saveMutation.isPending) return;

    saveMutation.mutate();
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Store search query in URL params when navigating to home
      setLocation(`/?search=${encodeURIComponent(query.trim())}`);
    } else {
      setLocation("/");
    }
  };

  const handleViewModeChange = (mode: "home" | "popular") => {
    setViewMode(mode);
    setLocation("/"); // Navigate back to home with new view mode
  };

  const formatTimeAgo = (dateStr: string | Date | null) => {
    if (!dateStr) return "unknown";
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "unknown";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-reddit-dark">
        <Header 
          onSearch={handleSearch}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">Loading post...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-reddit-dark">
        <Header 
          onSearch={handleSearch}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ml-80 lg:ml-80">
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">Post not found</div>
            <Button 
              onClick={() => cameFromProfile ? setLocation("/profile") : setLocation("/")}
              className="mt-4 bg-reddit-blue text-white hover:bg-reddit-blue/90"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {cameFromProfile ? "Back to Profile" : "Back to Home"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-reddit-dark">
      <Header 
        onSearch={handleSearch}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ml-80 lg:ml-80">
        {/* Back button */}
        <Button 
          onClick={() => cameFromProfile ? setLocation("/profile") : setLocation("/")}
          variant="ghost"
          className="mb-4 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {cameFromProfile ? "Back to Profile" : "Back to Home"}
        </Button>

        {/* Post Details */}
        <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex">
            {/* Voting */}
            <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-reddit-dark">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(1)}
                className={`p-2 w-10 h-10 transition-all duration-200 rounded-md ${
                  userVote === 1 
                    ? "text-orange-500 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 shadow-sm" 
                    : "text-gray-400 dark:text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800 border border-transparent"
                }`}
              >
                <ChevronUp className="h-5 w-5" />
              </Button>
              <span className={`text-base font-bold py-2 transition-colors duration-200 ${
                userVote === 1 ? "text-orange-500" : 
                userVote === -1 ? "text-purple-500" : 
                "text-gray-600 dark:text-gray-300"
              }`}>
                {post.votes || 0}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(-1)}
                className={`p-2 w-10 h-10 transition-all duration-200 rounded-md ${
                  userVote === -1 
                    ? "text-purple-500 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 shadow-sm" 
                    : "text-gray-400 dark:text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800 border border-transparent"
                }`}
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>

            {/* Post Content */}
            <div className="flex-1 p-6">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span className="font-medium text-gray-900 dark:text-white">
                  r/{subreddit?.name || "general"}
                </span>
                <span className="mx-1">•</span>
                <span>Posted by u/{post.authorUsername}</span>
                <span className="mx-1">•</span>
                <span>{formatTimeAgo(post.createdAt)}</span>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {post.title}
              </h1>
              
              {post.content && (
                <div className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                  {post.content}
                </div>
              )}

              {post.imageUrl && (
                <div className="mb-4">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="rounded-md w-full max-w-2xl object-cover"
                  />
                </div>
              )}

              {post.linkUrl && (
                <div className="mb-4">
                  <a
                    href={post.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-reddit-blue hover:underline break-all"
                  >
                    {post.linkUrl}
                  </a>
                </div>
              )}
              
              <div className="flex items-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = `${window.location.origin}/post/${id}`;
                    navigator.clipboard.writeText(url).then(() => {
                      setSharedPost(parseInt(id!));
                      toast({
                        title: "Link copied",
                        description: "Post link copied to clipboard",
                      });
                    }).catch(() => {
                      toast({
                        title: "Error",
                        description: "Failed to copy link to clipboard",
                        variant: "destructive",
                      });
                    });
                  }}
                  className={`flex items-center space-x-1 text-xs hover:bg-gray-100 dark:hover:bg-reddit-dark ${
                    isShared(parseInt(id!)) 
                      ? 'text-orange-500 dark:text-orange-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Share className="h-4 w-4" />
                  <span>Share</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className={`flex items-center space-x-1 text-xs hover:bg-gray-100 dark:hover:bg-reddit-dark ${
                    (optimisticSaved !== null ? optimisticSaved : !!isSaved) 
                      ? 'text-red-500 dark:text-red-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BookmarkPlus className="h-4 w-4" />
                  )}
                  <span>{(optimisticSaved !== null ? optimisticSaved : !!isSaved) ? 'Saved' : 'Save'}</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Comments */}
        <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Comments
            </h3>
            <CommentThread postId={parseInt(id!)} />
          </div>
        </Card>
      </div>

    </div>
  );
}
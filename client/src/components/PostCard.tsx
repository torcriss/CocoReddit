import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { MessageSquare, Share2, BookmarkPlus, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

import type { Post } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useSharedState } from "@/hooks/useSharedState";
import { useLocation } from "wouter";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [userVote, setUserVote] = useState<number | null>(null);
  const [optimisticVotes, setOptimisticVotes] = useState(post.votes || 0);
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { isShared, setSharedPost } = useSharedState();

  // Fetch user's current vote for this post
  const { data: currentVote } = useQuery({
    queryKey: ["/api/votes/user", post.id],
    queryFn: async () => {
      if (!isAuthenticated || !user) return null;
      try {
        const response = await fetch(`/api/votes/user/${post.id}`);
        if (response.ok) {
          const vote = await response.json();
          return vote?.voteType || null;
        }
      } catch (error) {
        // Ignore error, just return null
      }
      return null;
    },
    enabled: isAuthenticated && !!user,
  });

  // Fetch subreddit information if post has a subredditId
  const { data: subreddit } = useQuery({
    queryKey: ["/api/subreddits", post.subredditId],
    queryFn: async () => {
      if (!post.subredditId) return null;
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
    enabled: !!post.subredditId,
  });

  // Fetch saved status
  const { data: isSaved } = useQuery({
    queryKey: ["/api/saved-posts", post.id],
    queryFn: async () => {
      if (!isAuthenticated || !user) return false;
      try {
        const response = await fetch(`/api/saved-posts/${post.id}`);
        if (response.ok) {
          const savedPost = await response.json();
          return !!savedPost;
        }
      } catch (error) {
        // Ignore error, return false
      }
      return false;
    },
    enabled: isAuthenticated && !!user,
  });

  // Check if user has commented on this post
  const { data: hasCommented } = useQuery({
    queryKey: ["/api/comments/user-commented", post.id],
    queryFn: async () => {
      if (!isAuthenticated || !user) return false;
      try {
        const response = await fetch(`/api/comments/user-commented/${post.id}`);
        if (response.ok) {
          const result = await response.json();
          return result.hasCommented;
        }
      } catch (error) {
        // Ignore error, return false
      }
      return false;
    },
    enabled: isAuthenticated && !!user,
  });

  // Set user vote when data is loaded
  useEffect(() => {
    if (currentVote !== undefined) {
      setUserVote(currentVote);
    }
  }, [currentVote]);

  // Voting mutation
  const voteMutation = useMutation({
    mutationFn: async (voteType: number) => {
      const newVoteType = userVote === voteType ? 0 : voteType;
      return await apiRequest(`/api/votes`, {
        method: "POST",
        body: JSON.stringify({
          postId: post.id,
          voteType: newVoteType,
        }),
      });
    },
    onMutate: async (voteType: number) => {
      const newVoteType = userVote === voteType ? 0 : voteType;
      const oldVoteType = userVote;
      
      // Calculate vote difference
      let voteDiff = 0;
      if (oldVoteType === 1 && newVoteType === 0) voteDiff = -1;
      else if (oldVoteType === 1 && newVoteType === -1) voteDiff = -2;
      else if (oldVoteType === 0 && newVoteType === 1) voteDiff = 1;
      else if (oldVoteType === 0 && newVoteType === -1) voteDiff = -1;
      else if (oldVoteType === -1 && newVoteType === 0) voteDiff = 1;
      else if (oldVoteType === -1 && newVoteType === 1) voteDiff = 2;

      // Optimistic update
      setUserVote(newVoteType);
      setOptimisticVotes(prev => Math.max(0, prev + voteDiff));

      return { oldVoteType, voteDiff };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/votes/user", post.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update
      if (context) {
        setUserVote(context.oldVoteType);
        setOptimisticVotes(prev => Math.max(0, prev - context.voteDiff));
      }
      
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

  // Save post mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentSaved = optimisticSaved !== null ? optimisticSaved : !!isSaved;
      if (currentSaved) {
        return await apiRequest(`/api/saved-posts/${post.id}`, {
          method: "DELETE",
        });
      } else {
        return await apiRequest(`/api/saved-posts`, {
          method: "POST",
          body: JSON.stringify({ postId: post.id }),
        });
      }
    },
    onMutate: async () => {
      const previousSaved = optimisticSaved !== null ? optimisticSaved : !!isSaved;
      setOptimisticSaved(!previousSaved);
      return { previousSaved };
    },
    onSuccess: () => {
      // Invalidate all related saved posts queries
      queryClient.invalidateQueries({ queryKey: ["/api/saved-posts", post.id] });
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

    // Don't allow voting while mutation is pending
    if (voteMutation.isPending) return;

    voteMutation.mutate(voteType);
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

  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    
    navigator.clipboard.writeText(postUrl).then(() => {
      setSharedPost(post.id);
      toast({
        title: "Link copied!",
        description: "Post link has been copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  const formatTimeAgo = (date: Date | null) => {
    try {
      if (!date) return "unknown";
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return "unknown";
    }
  };

  const handlePostClick = () => {
    // Track visited post
    const stored = localStorage.getItem('visitedPosts');
    let visitedIds: number[] = [];
    if (stored) {
      try {
        visitedIds = JSON.parse(stored);
      } catch {
        visitedIds = [];
      }
    }
    const newVisitedIds = [post.id, ...visitedIds.filter(id => id !== post.id)];
    localStorage.setItem('visitedPosts', JSON.stringify(newVisitedIds));
    
    // Dispatch custom event to notify Sidebar of the change
    window.dispatchEvent(new CustomEvent('visitedPostsChanged'));
    
    setLocation(`/post/${post.id}`);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors mb-4">
      <div className="p-3">
        <div className="flex items-start space-x-3">
          {/* Community Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
            <span className="text-white text-xs font-bold">
              {subreddit?.name?.charAt(0).toUpperCase() || 'C'}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Post Header */}
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span className="font-medium">r/{subreddit?.name || 'general'}</span>
              <span>•</span>
              <span>Posted by u/{post.authorUsername}</span>
              <span>•</span>
              <span>{formatTimeAgo(post.createdAt)}</span>
            </div>
            
            {/* Post Title */}
            <h3 
              className="text-lg font-medium text-gray-900 dark:text-white mb-3 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
              onClick={handlePostClick}
            >
              {post.title}
            </h3>
            
            {/* Post Content Preview */}
            {post.content && (
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                {post.content.length > 300 ? `${post.content.substring(0, 300)}...` : post.content}
              </div>
            )}
            
            {/* Image Preview */}
            {post.imageUrl && (
              <div className="mb-3">
                <img 
                  src={post.imageUrl} 
                  alt={post.title}
                  className="max-w-md max-h-96 rounded-lg object-cover cursor-pointer"
                  onClick={handlePostClick}
                />
              </div>
            )}
            
            {/* Link Preview */}
            {post.linkUrl && (
              <a
                href={post.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-3 block"
              >
                {post.linkUrl}
              </a>
            )}
            
            {/* Action Bar */}
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              {/* Vote Section */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote(1)}
                  className={cn(
                    "p-1 h-7 w-7 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
                    userVote === 1 ? "text-reddit-orange bg-orange-50 dark:bg-orange-900/20" : "text-gray-500 dark:text-gray-400"
                  )}
                  disabled={!isAuthenticated || voteMutation.isPending}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <span className={cn(
                  "text-sm font-medium min-w-[2rem] text-center",
                  userVote === 1 ? "text-reddit-orange" : userVote === -1 ? "text-purple-500" : "text-gray-600 dark:text-gray-400"
                )}>
                  {optimisticVotes}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote(-1)}
                  className={cn(
                    "p-1 h-7 w-7 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
                    userVote === -1 ? "text-purple-500 bg-purple-50 dark:bg-purple-900/20" : "text-gray-500 dark:text-gray-400"
                  )}
                  disabled={!isAuthenticated || voteMutation.isPending}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Comments */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePostClick}
                className={cn(
                  "flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
                  hasCommented ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                <span>{post.commentCount || 0} comments</span>
              </Button>
              
              {/* Share */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className={cn(
                  "flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
                  isShared === post.id ? "text-reddit-orange bg-orange-50 dark:bg-orange-900/20" : "text-gray-500 dark:text-gray-400"
                )}
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
              
              {/* Save */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={!isAuthenticated || saveMutation.isPending}
                className={cn(
                  "flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
                  (optimisticSaved !== null ? optimisticSaved : !!isSaved) ? "text-red-500 bg-red-50 dark:bg-red-900/20" : "text-gray-500 dark:text-gray-400"
                )}
              >
                <BookmarkPlus className="h-4 w-4" />
                <span>Save</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
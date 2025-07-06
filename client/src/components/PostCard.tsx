import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { MessageSquare, Share2, BookmarkPlus, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

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

  // Check if post is saved by the user
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
        // Ignore error, just return false
      }
      return false;
    },
    enabled: isAuthenticated && !!user,
  });

  // Update local state when vote data is fetched
  useEffect(() => {
    if (currentVote !== undefined) {
      setUserVote(currentVote);
    }
  }, [currentVote]);

  // Update optimistic votes when post changes
  useEffect(() => {
    setOptimisticVotes(post.votes || 0);
  }, [post.votes]);

  // Reset optimistic saved state when saved data is updated
  useEffect(() => {
    if (isSaved !== undefined) {
      setOptimisticSaved(null);
    }
  }, [isSaved]);

  const voteMutation = useMutation({
    mutationFn: async (voteType: number) => {
      return apiRequest("POST", "/api/votes", {
        postId: post.id,
        voteType,
      });
    },
    onMutate: async (voteType: number) => {
      // Optimistic update
      const previousVote = userVote;
      const previousVotes = optimisticVotes;
      
      // Calculate new vote value and count
      let newVoteCount = optimisticVotes;
      if (previousVote === voteType) {
        // Removing vote
        setUserVote(null);
        newVoteCount = optimisticVotes - voteType;
      } else if (previousVote === null) {
        // Adding new vote
        setUserVote(voteType);
        newVoteCount = optimisticVotes + voteType;
      } else {
        // Changing vote
        setUserVote(voteType);
        newVoteCount = optimisticVotes - previousVote + voteType;
      }
      
      setOptimisticVotes(newVoteCount);
      
      // Return context for rollback
      return { previousVote, previousVotes };
    },
    onSuccess: () => {
      // Only invalidate vote-related queries, not the posts list to prevent reordering
      queryClient.invalidateQueries({ queryKey: ["/api/votes/user", post.id] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context) {
        setUserVote(context.previousVote);
        setOptimisticVotes(context.previousVotes);
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/saved-posts", {
        postId: post.id,
      });
    },
    onMutate: async () => {
      // Optimistic update
      const currentSaved = optimisticSaved !== null ? optimisticSaved : !!isSaved;
      setOptimisticSaved(!currentSaved);
      
      return { previousSaved: currentSaved };
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

  const formatTimeAgo = (date: Date | null) => {
    try {
      if (!date) return "unknown";
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return "unknown";
    }
  };

  return (
    <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors overflow-hidden">
      <div className="p-4">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="font-medium text-blue-600 dark:text-blue-400">
            r/{subreddit?.name || "general"}
          </span>
          <span className="mx-1">•</span>
          <span>Posted by u/{post.authorUsername}</span>
          <span className="mx-1">•</span>
          <span>{formatTimeAgo(post.createdAt)}</span>
        </div>
        
        <h2 
          className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-reddit-blue cursor-pointer"
          onClick={() => {
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
            
            setLocation(`/post/${post.id}`);
          }}
        >
          {post.title}
        </h2>
        
        {post.content && (
          <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
            {post.content.length > 300 ? `${post.content.substring(0, 300)}...` : post.content}
          </p>
        )}
        
        {post.imageUrl && (
          <div className="mb-3">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
            />
          </div>
        )}
        
        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-reddit-blue hover:underline text-sm mb-3 block"
          >
            {post.linkUrl}
          </a>
        )}
        
        {/* Action Bar */}
        <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          {/* Vote Section */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote(1)}
              disabled={voteMutation.isPending}
              className={`p-1 h-8 w-8 transition-all duration-200 rounded-md ${
                userVote === 1 
                  ? "text-orange-500 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 shadow-sm" 
                  : "text-gray-400 dark:text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800 border border-transparent"
              } ${
                voteMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {voteMutation.isPending && userVote === 1 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <span className={`text-sm font-bold transition-colors duration-200 min-w-[24px] text-center px-1 ${
              userVote === 1 ? "text-orange-500" : 
              userVote === -1 ? "text-purple-500" : 
              "text-gray-600 dark:text-gray-300"
            }`}>
              {optimisticVotes}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote(-1)}
              disabled={voteMutation.isPending}
              className={`p-1 h-8 w-8 transition-all duration-200 rounded-md ${
                userVote === -1 
                  ? "text-purple-500 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 shadow-sm" 
                  : "text-gray-400 dark:text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800 border border-transparent"
              } ${
                voteMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {voteMutation.isPending && userVote === -1 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Comment Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
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
              
              setLocation(`/post/${post.id}`);
            }}
            className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-reddit-dark text-gray-500 dark:text-gray-400"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{post.commentCount || 0}</span>
          </Button>
          
          {/* Share Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              const url = `${window.location.origin}/post/${post.id}`;
              navigator.clipboard.writeText(url).then(() => {
                setSharedPost(post.id);
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
            className={`flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-reddit-dark ${
              isShared(post.id) 
                ? 'text-orange-500 dark:text-orange-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
          
          {/* Save Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className={`flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-reddit-dark ${
              (optimisticSaved !== null ? optimisticSaved : !!isSaved) 
                ? 'text-orange-500 dark:text-orange-400' 
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

    </Card>
  );
}
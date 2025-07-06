import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { MessageSquare, Share2, BookmarkPlus, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import CommentThread from "./CommentThread";
import ShareDialog from "./ShareDialog";
import type { Post } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [userVote, setUserVote] = useState<number | null>(null);
  const [optimisticVotes, setOptimisticVotes] = useState(post.votes || 0);
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

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
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
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

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return "unknown";
    }
  };

  return (
    <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors overflow-hidden">
      <div className="p-4">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="font-medium text-gray-900 dark:text-white">
            r/{subreddit?.name || "general"}
          </span>
          <span className="mx-1">•</span>
          <span>Posted by u/{post.authorUsername}</span>
          <span className="mx-1">•</span>
          <span>{formatTimeAgo(post.createdAt)}</span>
        </div>
        
        <h2 
          className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-reddit-blue cursor-pointer"
          onClick={() => setLocation(`/post/${post.id}`)}
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
              className={`p-1 h-8 w-8 transition-all duration-200 ${
                userVote === 1 
                  ? "text-reddit-orange bg-reddit-orange/20 border border-reddit-orange/30" 
                  : "text-gray-400 hover:text-reddit-orange hover:bg-reddit-orange/10"
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
            <span className={`text-sm font-bold transition-colors duration-200 min-w-[20px] text-center ${
              userVote === 1 ? "text-reddit-orange" : 
              userVote === -1 ? "text-blue-500" : 
              "text-gray-900 dark:text-white"
            }`}>
              {optimisticVotes}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote(-1)}
              disabled={voteMutation.isPending}
              className={`p-1 h-8 w-8 transition-all duration-200 ${
                userVote === -1 
                  ? "text-blue-500 bg-blue-500/20 border border-blue-500/30" 
                  : "text-gray-400 hover:text-blue-500 hover:bg-blue-500/10"
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
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-reddit-dark text-gray-500 dark:text-gray-400"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{post.commentCount || 0}</span>
          </Button>
          
          {/* Share Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShareDialog(true)}
            className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-reddit-dark text-gray-500 dark:text-gray-400"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
          
          {/* Save Button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-reddit-dark text-gray-500 dark:text-gray-400"
          >
            <BookmarkPlus className="h-4 w-4" />
            <span>Save</span>
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <CommentThread postId={post.id} />
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={post.id}
        postTitle={post.title}
      />
    </Card>
  );
}
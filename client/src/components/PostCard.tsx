import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { MessageCircle, Share, Bookmark, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
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

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "unknown";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "unknown";
    }
  };

  return (
    <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors overflow-hidden">
      <div className="flex">
        {/* Vote Section */}
        <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-reddit-dark">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote(1)}
            disabled={voteMutation.isPending}
            className={`p-1 transition-all duration-200 ${
              userVote === 1 
                ? "text-reddit-orange bg-reddit-orange/20 border border-reddit-orange/30" 
                : "text-gray-400 hover:text-reddit-orange hover:bg-reddit-orange/10"
            } ${
              voteMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {voteMutation.isPending && userVote === 1 ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </Button>
          <span className={`text-sm font-bold py-1 transition-colors duration-200 ${
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
            className={`p-1 transition-all duration-200 ${
              userVote === -1 
                ? "text-blue-500 bg-blue-500/20 border border-blue-500/30" 
                : "text-gray-400 hover:text-blue-500 hover:bg-blue-500/10"
            } ${
              voteMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {voteMutation.isPending && userVote === -1 ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Post Content */}
        <div className="flex-1 p-4">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-medium text-gray-900 dark:text-white">r/general</span>
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
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              {post.content}
            </p>
          )}

          {post.imageUrl && (
            <div className="mb-3">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="rounded-md w-full h-64 object-cover cursor-pointer hover:brightness-110 transition-all"
              />
            </div>
          )}

          {post.linkUrl && (
            <div className="mb-3">
              <a
                href={post.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-reddit-blue hover:underline"
              >
                {post.linkUrl}
              </a>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Collapsible open={showComments} onOpenChange={setShowComments}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-reddit-dark"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.commentCount || 0} comments</span>
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareDialog(true)}
                className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-reddit-dark"
              >
                <Share className="h-4 w-4" />
                <span>Share</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-reddit-dark"
              >
                <Bookmark className="h-4 w-4" />
                <span>Save</span>
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          <Collapsible open={showComments} onOpenChange={setShowComments}>
            <CollapsibleContent className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <CommentThread postId={post.id} />
            </CollapsibleContent>
          </Collapsible>
        </div>
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

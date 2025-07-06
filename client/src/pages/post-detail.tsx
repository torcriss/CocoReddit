import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share, Bookmark, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import CommentThread from "@/components/CommentThread";
import ShareDialog from "@/components/ShareDialog";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Post } from "@shared/schema";
import { useLocation } from "wouter";

export default function PostDetail() {
  const { id } = useParams();
  const [userVote, setUserVote] = useState<number | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"home" | "popular">("home");
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setLocation("/"); // Navigate back to home with search
  };

  const handleViewModeChange = (mode: "home" | "popular") => {
    setViewMode(mode);
    setLocation("/"); // Navigate back to home with new view mode
  };

  const formatTimeAgo = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return formatDistanceToNow(date, { addSuffix: true });
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">Post not found</div>
            <Button 
              onClick={() => setLocation("/")}
              className="mt-4 bg-reddit-blue text-white hover:bg-reddit-blue/90"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
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
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back button */}
        <Button 
          onClick={() => setLocation("/")}
          variant="ghost"
          className="mb-4 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
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
                className={`p-1 ${
                  userVote === 1 
                    ? "text-reddit-orange bg-reddit-orange/10" 
                    : "text-gray-400 hover:text-reddit-orange hover:bg-gray-100 dark:hover:bg-reddit-darker"
                }`}
              >
                <ChevronUp className="h-5 w-5" />
              </Button>
              <span className={`text-sm font-bold py-1 ${
                userVote === 1 ? "text-reddit-orange" : 
                userVote === -1 ? "text-blue-500" : 
                "text-gray-900 dark:text-white"
              }`}>
                {post.votes || 0}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(-1)}
                className={`p-1 ${
                  userVote === -1 
                    ? "text-blue-500 bg-blue-500/10" 
                    : "text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-reddit-darker"
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

      <ShareDialog 
        open={showShareDialog} 
        onOpenChange={setShowShareDialog}
        postId={post.id}
        postTitle={post.title}
      />
    </div>
  );
}
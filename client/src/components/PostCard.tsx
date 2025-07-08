import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Share2, 
  Bookmark, 
  ExternalLink,
  Hash
} from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Post } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import { useSharedState } from "@/hooks/useSharedState";
import { useState, useEffect } from "react";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  // Early return if post doesn't exist
  if (!post) {
    return null;
  }

  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { isShared, setSharedPost } = useSharedState();

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
        const response = await fetch(`/api/saved-posts/${post.id}`, {
          method: "GET",
        });
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

  // Clear optimistic saved state when actual data loads
  useEffect(() => {
    if (isSaved !== undefined) {
      setOptimisticSaved(null);
    }
  }, [isSaved]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentSaved = optimisticSaved !== null ? optimisticSaved : isSaved;
      
      // Optimistically update the UI
      setOptimisticSaved(!currentSaved);
      
      if (!currentSaved) {
        // Save the post
        return await apiRequest("POST", "/api/saved-posts", {
          postId: post.id,
        });
      } else {
        // Unsave the post
        return await apiRequest("DELETE", `/api/saved-posts/${post.id}`, {});
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/saved-posts", post.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update on error
      const currentSaved = optimisticSaved !== null ? optimisticSaved : isSaved;
      setOptimisticSaved(currentSaved);
      
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
        description: "Failed to save post",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Check if post exists to prevent errors
    if (!post) return;
    
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
    // Check if post exists to prevent errors
    if (!post) return;
    
    const postUrl = `${window.location.origin}/post/${post.id}`;
    
    navigator.clipboard.writeText(postUrl).then(() => {
      setSharedPost(post.id);
      toast({
        title: "Link copied!",
        description: "Post link has been copied to clipboard",
      });
    });
  };

  const handlePostClick = () => {
    // Check if post exists to prevent errors
    if (!post) return;
    
    // Save visited post to localStorage
    const visitedPosts = JSON.parse(localStorage.getItem("visitedPosts") || "[]");
    const existingIndex = visitedPosts.findIndex((p: any) => p.id === post.id);
    
    if (existingIndex > -1) {
      // Move to beginning if already exists
      visitedPosts.splice(existingIndex, 1);
    }
    
    visitedPosts.unshift({
      id: post.id,
      title: post.title,
      subredditId: post.subredditId,
      commentCount: post.commentCount,
      timestamp: Date.now()
    });
    
    // Keep only last 100 visited posts
    visitedPosts.splice(100);
    
    localStorage.setItem("visitedPosts", JSON.stringify(visitedPosts));
    
    // Trigger custom event to update sidebar
    window.dispatchEvent(new CustomEvent("visitedPostsChanged"));
    
    setLocation(`/post/${post.id}`);
  };

  // Determine if saved (using optimistic state if available)
  const displaySaved = optimisticSaved !== null ? optimisticSaved : isSaved;

  return (
    <Card className="mb-4 bg-white dark:bg-reddit-darker border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <CardHeader className="pb-3 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {/* Community Avatar */}
            <Avatar className="h-8 w-8">
              <AvatarImage src={subreddit?.avatarUrl || `/api/placeholder/32/32`} />
              <AvatarFallback className="bg-reddit-orange text-white text-sm">
                {subreddit?.name?.slice(0, 2).toUpperCase() || "r/"}
              </AvatarFallback>
            </Avatar>
            
            {/* Post Metadata */}
            <div className="flex flex-col">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  r/{subreddit?.name || "general"}
                </span>
                <span>•</span>
                <span>by {post.authorUsername}</span>
                <span>•</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-4">
        <div className="cursor-pointer" onClick={handlePostClick}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {post.title}
          </h3>
          
          {/* Post Content */}
          {post.content && (
            <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm line-clamp-3">
              {post.content}
            </p>
          )}
          
          {/* Image Content */}
          {post.imageUrl && (
            <div className="mb-3 rounded-lg overflow-hidden">
              <img 
                src={post.imageUrl} 
                alt={post.title}
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}
          
          {/* Link Content */}
          {post.linkUrl && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <a 
                  href={post.linkUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.linkUrl}
                </a>
              </div>
            </div>
          )}
        </div>
        
        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
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
              <MessageSquare className={cn("h-4 w-4", hasCommented ? "fill-current" : "")} />
              <span>{post.commentCount || 0}</span>
            </Button>
            
            {/* Share */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
            
            {/* Save */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
                displaySaved ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20" : "text-gray-500 dark:text-gray-400"
              )}
            >
              <Bookmark className={cn("h-4 w-4", displaySaved ? "fill-current" : "")} />
              <span>{displaySaved ? "Saved" : "Save"}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
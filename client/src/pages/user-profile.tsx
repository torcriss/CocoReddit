import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar, User, ArrowLeft, Trash2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import type { Post, Comment, Subreddit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function UserProfile() {
  const { user, isAuthenticated } = useAuth();
  const [displaySavedPosts, setDisplaySavedPosts] = useState(10);
  const [displayComments, setDisplayComments] = useState(10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // All queries must be at the top level to avoid hooks order issues
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts?sortBy=hot");
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
  });

  const { data: allComments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments/all", posts.map(p => p.id).sort()],
    queryFn: async () => {
      // Fetch comments from all posts
      const commentPromises = posts.map(async (post) => {
        const response = await fetch(`/api/posts/${post.id}/comments`);
        if (!response.ok) return [];
        return response.json();
      });
      const commentArrays = await Promise.all(commentPromises);
      return commentArrays.flat();
    },
    enabled: posts.length > 0,
    refetchInterval: 10000, // Refetch every 10 seconds to catch new comments
  });

  const { data: savedPosts = [] } = useQuery<Post[]>({
    queryKey: ["/api/saved-posts"],
    enabled: isAuthenticated && !!user,
  });

  const { data: subreddits = [] } = useQuery<Subreddit[]>({
    queryKey: ["/api/subreddits"],
  });

  // Clear all saved posts mutation - must be before early return
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

  // Early return after all hooks are called
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-reddit-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please log in to view your profile
          </h1>
        </div>
      </div>
    );
  }

  // Calculate user-specific data
  const userIdentifier = user.firstName || user.email || "anonymous";
  const userPosts = posts.filter((post: Post) => {
    return post.authorUsername === userIdentifier || 
           post.authorUsername === user.firstName ||
           post.authorUsername === user.email;
  });

  const userComments = allComments.filter((comment: Comment) => {
    return comment.authorUsername === userIdentifier || 
           comment.authorUsername === user.firstName ||
           comment.authorUsername === user.email ||
           comment.authorUsername === (user.firstName || user.email);
  });


  const displayName = user.firstName || user.email?.split('@')[0] || 'Anonymous';

  const formatTimeAgo = (date: Date | null) => {
    try {
      if (!date) return "just now";
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  const getSubredditName = (subredditId?: number | null) => {
    if (!subredditId) return null;
    const subreddit = subreddits.find((s: Subreddit) => s.id === subredditId);
    return subreddit?.name || null;
  };

  const handleClearSavedPosts = () => {
    if (savedPosts.length === 0) return;
    clearSavedPostsMutation.mutate();
  };

  const handlePostClick = (postId: number) => {
    // Set a flag to indicate we came from profile
    localStorage.setItem('cameFromProfile', 'true');
    setLocation(`/post/${postId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-reddit-dark">
      <div className="max-w-6xl mx-auto px-4 py-8 mr-80 lg:mr-80">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Homepage</span>
          </Button>
        </div>

        {/* Profile Header */}
        <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.profileImageUrl || ""} alt={displayName} />
                <AvatarFallback className="bg-reddit-blue text-white text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {displayName}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {user.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'recently'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {userPosts.length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Posts
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {userComments.length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Comments
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Saved Posts */}
          <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  Saved Posts ({savedPosts.length})
                </CardTitle>
                {savedPosts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSavedPosts}
                    disabled={clearSavedPostsMutation.isPending}
                    className="text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Clear all saved posts"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedPosts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No saved posts yet
                  </div>
                ) : (
                  savedPosts.map((post) => (
                    <div
                      key={`profile-saved-${post.id}`}
                      onClick={() => handlePostClick(post.id)}
                      className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-reddit-dark transition-colors cursor-pointer"
                    >
                      {getSubredditName(post.subredditId ?? undefined) && (
                        <div className="mb-2">
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            r/{getSubredditName(post.subredditId ?? undefined)}
                          </span>
                        </div>
                      )}
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.commentCount || 0}</span>
                          </div>
                        </div>
                        <span>{formatTimeAgo(post.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Comments */}
          <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Comments ({userComments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userComments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No comments yet
                  </div>
                ) : (
                  userComments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((comment) => {
                    const commentPost = posts.find(p => p.id === comment.postId);
                    return (
                      <div
                        key={`profile-comment-${comment.id}`}
                        onClick={() => {
                          if (comment.postId) {
                            localStorage.setItem('cameFromProfile', 'true');
                            setLocation(`/post/${comment.postId}#comment-${comment.id}`);
                          }
                        }}
                        className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-reddit-dark transition-colors cursor-pointer"
                      >
                        {commentPost && getSubredditName(commentPost.subredditId ?? undefined) && (
                          <div className="mb-1">
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              r/{getSubredditName(commentPost.subredditId ?? undefined)}
                            </span>
                          </div>
                        )}
                        {commentPost && (
                          <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                            {commentPost.title}
                          </h3>
                        )}
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-3">
                          {comment.content}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <MessageCircle className="h-4 w-4" />
                              <span>{commentPost?.commentCount || 0}</span>
                            </div>
                          </div>
                          <span>{formatTimeAgo(comment.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar, User, ArrowLeft } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import type { Post, Comment, Subreddit } from "@shared/schema";

export default function UserProfile() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [visitedPostIds, setVisitedPostIds] = useState<number[]>([]);

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts?sortBy=hot");
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
  });

  // Get visited posts specifically (same as sidebar)
  const { data: visitedPostsData = [] } = useQuery<Post[]>({
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

  // Load visited posts from localStorage on component mount
  useEffect(() => {
    const stored = localStorage.getItem('visitedPosts');
    if (stored) {
      try {
        const parsedIds = JSON.parse(stored);
        // Validate that all items are numbers
        const validIds = parsedIds.filter((id: any) => typeof id === 'number' && !isNaN(id));
        setVisitedPostIds(validIds);
        
        // If we had to filter out invalid IDs, update localStorage
        if (validIds.length !== parsedIds.length) {
          localStorage.setItem('visitedPosts', JSON.stringify(validIds));
        }
      } catch {
        setVisitedPostIds([]);
        localStorage.removeItem('visitedPosts');
      }
    }
  }, []);

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
  
  // Get user's own posts and visited posts (same logic as sidebar)
  const userOwnPosts = posts
    .filter(post => post.authorUsername === userIdentifier)
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  
  // Visited posts (excluding user's own posts to avoid duplicates)
  const visitedPosts = visitedPostsData
    .filter(post => post.authorUsername !== userIdentifier)
    .sort((a, b) => {
      // Sort by when they were visited (most recent first)
      const aIndex = visitedPostIds.indexOf(a.id);
      const bIndex = visitedPostIds.indexOf(b.id);
      return aIndex - bIndex;
    });
  
  // Combine: user's posts first, then visited posts
  const recentPosts = [...userOwnPosts, ...visitedPosts];

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

  const handlePostClick = (postId: number) => {
    // Ensure postId is a valid number
    if (typeof postId !== 'number' || isNaN(postId)) {
      console.error('Invalid post ID:', postId);
      return;
    }
    
    // Add to visited posts and update localStorage
    const newVisitedIds = [postId, ...visitedPostIds.filter(id => id !== postId)];
    setVisitedPostIds(newVisitedIds);
    localStorage.setItem('visitedPosts', JSON.stringify(newVisitedIds));
    
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Posts */}
          <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Posts ({recentPosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPosts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No posts yet
                  </div>
                ) : (
                  recentPosts.map((post) => (
                    <div
                      key={`profile-recent-${post.id}`}
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

          {/* Saved Posts */}
          <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Saved Posts ({savedPosts.length})
              </CardTitle>
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
                  userComments.map((comment) => {
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
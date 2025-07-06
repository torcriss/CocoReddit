import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ChevronUp, Calendar, User } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Post, Comment } from "@shared/schema";

export default function UserProfile() {
  const { user, isAuthenticated } = useAuth();

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const { data: allComments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments/all"],
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
  });

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

  const totalVotes = userPosts.reduce((sum, post) => sum + (post.votes || 0), 0);
  const displayName = user.firstName || user.email?.split('@')[0] || 'Anonymous';

  const formatTimeAgo = (date: Date | null) => {
    try {
      if (!date) return "just now";
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-reddit-dark">
      <div className="max-w-6xl mx-auto px-4 py-8">
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
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalVotes}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Total Karma
                    </div>
                  </div>
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
          {/* Recent Posts */}
          <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Posts ({userPosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userPosts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No posts yet
                  </div>
                ) : (
                  userPosts.slice(0, 5).map((post) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-reddit-dark transition-colors"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <ChevronUp className="h-4 w-4" />
                            <span>{post.votes || 0}</span>
                          </div>
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
                  userComments.slice(0, 5).map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-reddit-dark transition-colors"
                    >
                      <p className="text-gray-900 dark:text-white mb-2 line-clamp-3">
                        {comment.content}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <ChevronUp className="h-4 w-4" />
                          <span>{comment.votes || 0}</span>
                        </div>
                        <span>{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* About Section */}
        <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Reddit Clone - Personal Social Platform
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Welcome to your personal Reddit-style community platform! This is a space where you can 
                  share thoughts, engage in discussions, and connect with like-minded individuals. 
                  Create posts, join conversations through comments, and use the voting system to 
                  highlight the best content.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Features
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Posts & Comments</Badge>
                  <Badge variant="secondary">Voting System</Badge>
                  <Badge variant="secondary">Community Subreddits</Badge>
                  <Badge variant="secondary">Search & Discovery</Badge>
                  <Badge variant="secondary">Dark Mode</Badge>
                  <Badge variant="secondary">Responsive Design</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  How to Use
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Browse posts in different communities using the sidebar</li>
                  <li>• Create new posts using the "Create" button in the header</li>
                  <li>• Vote on posts and comments to show your appreciation</li>
                  <li>• Join discussions by adding thoughtful comments</li>
                  <li>• Use the search feature to find specific content</li>
                  <li>• Toggle between light and dark themes for your preference</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
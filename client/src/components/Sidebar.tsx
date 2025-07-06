import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ChevronUp, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import type { Subreddit, Post } from "@shared/schema";

interface SidebarProps {
  selectedSubreddit?: number | null;
  onSubredditSelect?: (subredditId: number | null) => void;
}

export default function Sidebar({ selectedSubreddit, onSubredditSelect }: SidebarProps) {
  const [, setLocation] = useLocation();
  const [visitedPostIds, setVisitedPostIds] = useState<number[]>([]);

  const { data: subreddits = [] } = useQuery<Subreddit[]>({
    queryKey: ["/api/subreddits"],
  });

  // Get all posts for recent posts section
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  // Load visited posts from localStorage on component mount
  useEffect(() => {
    const stored = localStorage.getItem('visitedPosts');
    if (stored) {
      try {
        setVisitedPostIds(JSON.parse(stored));
      } catch {
        setVisitedPostIds([]);
      }
    }
  }, []);

  // Get recently visited posts (posts user has clicked on)
  const recentPosts = posts
    .filter(post => visitedPostIds.includes(post.id))
    .sort((a, b) => {
      // Sort by when they were visited (most recent first)
      const aIndex = visitedPostIds.indexOf(a.id);
      const bIndex = visitedPostIds.indexOf(b.id);
      return aIndex - bIndex;
    })
    .slice(0, 5);

  const handlePostClick = (postId: number) => {
    // Add to visited posts and update localStorage
    const newVisitedIds = [postId, ...visitedPostIds.filter(id => id !== postId)];
    setVisitedPostIds(newVisitedIds);
    localStorage.setItem('visitedPosts', JSON.stringify(newVisitedIds));
    setLocation(`/post/${postId}`);
  };

  const clearRecentPosts = () => {
    setVisitedPostIds([]);
    localStorage.removeItem('visitedPosts');
  };

  const communityColors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-red-500", "bg-yellow-500", "bg-pink-500", "bg-indigo-500"
  ];

  const formatTimeAgo = (date: Date | null) => {
    try {
      if (!date) return "just now";
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  const getSubredditName = (subredditId?: number | null) => {
    if (!subredditId) return "general";
    const subreddit = subreddits.find(s => s.id === subredditId);
    return subreddit?.name || "general";
  };

  return (
    <aside className="w-80 hidden lg:block">
      <div className="sticky top-20 space-y-4">
        {/* Recent Posts */}
        <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Recent Posts
              </CardTitle>
              {recentPosts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentPosts}
                  className="text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 h-8 w-8"
                  title="Clear recent posts"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentPosts.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No visited posts yet
                </div>
              ) : (
                recentPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handlePostClick(post.id)}
                    className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-reddit-dark cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-reddit-blue font-medium mb-1">
                          r/{getSubredditName(post.subredditId || undefined)}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
                          {post.title}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <ChevronUp className="h-3 w-3" />
                            <span>{Math.max(0, post.votes || 0)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{post.commentCount || 0}</span>
                          </div>
                          <span>•</span>
                          <span>{formatTimeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import type { Subreddit, Post } from "@shared/schema";

interface SidebarProps {
  selectedSubreddit?: number | null;
  onSubredditSelect?: (subredditId: number | null) => void;
}

export default function Sidebar({ selectedSubreddit, onSubredditSelect }: SidebarProps) {
  const [, setLocation] = useLocation();

  const { data: subreddits = [] } = useQuery<Subreddit[]>({
    queryKey: ["/api/subreddits"],
  });

  // Get all posts for recent posts section
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  // Get recent posts (latest 5)
  const recentPosts = posts
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

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
        {/* Sidebar content removed as requested */}
      </div>
    </aside>
  );
}
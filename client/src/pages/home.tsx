import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Flame, Clock, TrendingUp, LayoutGrid, List } from "lucide-react";
import type { Post } from "@shared/schema";

export default function Home() {
  const [sortBy, setSortBy] = useState("hot");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"home" | "popular">("home");
  const [selectedSubreddit, setSelectedSubreddit] = useState<number | null>(null);

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts", { sortBy, search: searchQuery, viewMode, subredditId: selectedSubreddit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      // In popular mode, force "top" sorting and show all posts
      const effectiveSort = viewMode === "popular" ? "top" : sortBy;
      params.append("sortBy", effectiveSort);
      if (searchQuery) params.append("search", searchQuery);
      if (selectedSubreddit) params.append("subredditId", selectedSubreddit.toString());
      
      const response = await fetch(`/api/posts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
  });

  const sortOptions = [
    { key: "hot", label: "Hot", icon: Flame },
    { key: "new", label: "New", icon: Clock },
    { key: "top", label: "Top", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-reddit-dark">
      <Header 
        onSearch={setSearchQuery} 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Sort Options */}
            <div className="bg-white dark:bg-reddit-darker rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
              {viewMode === "popular" && (
                <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-reddit-orange" />
                    <span>Popular Posts</span>
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Showing the most upvoted posts across all communities
                  </p>
                </div>
              )}
              
              {selectedSubreddit && (
                <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Filtering by Community
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSubreddit(null)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Clear Filter
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* In popular mode, disable sort options and show only "Top" */}
                  {viewMode === "popular" ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex items-center space-x-2 bg-reddit-blue text-white hover:bg-reddit-blue/90"
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Top</span>
                    </Button>
                  ) : (
                    sortOptions.map(({ key, label, icon: Icon }) => (
                      <Button
                        key={key}
                        variant={sortBy === key ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSortBy(key)}
                        className={`flex items-center space-x-2 ${
                          sortBy === key 
                            ? "bg-reddit-blue text-white hover:bg-reddit-blue/90" 
                            : "text-gray-700 dark:text-gray-300 hover:text-reddit-blue"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </Button>
                    ))
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">Loading posts...</div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? "No posts found matching your search." : "No posts yet. Be the first to create one!"}
                  </div>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          </main>

          {/* Sidebar */}
          <Sidebar 
            selectedSubreddit={selectedSubreddit}
            onSubredditSelect={setSelectedSubreddit}
          />
        </div>
      </div>
    </div>
  );
}

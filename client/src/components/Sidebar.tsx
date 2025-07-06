import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreatePostDialog from "./CreatePostDialog";
import type { Subreddit } from "@shared/schema";

export default function Sidebar() {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const { data: subreddits = [] } = useQuery<Subreddit[]>({
    queryKey: ["/api/subreddits"],
  });

  const communityColors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-red-500", "bg-yellow-500", "bg-pink-500", "bg-indigo-500"
  ];

  return (
    <>
      <aside className="w-80 hidden lg:block">
        <div className="sticky top-20 space-y-4">
          {/* Create Post */}
          <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Create Post</h3>
              <Button
                onClick={() => setIsCreatePostOpen(true)}
                className="w-full flex items-center justify-center space-x-2 bg-reddit-blue text-white hover:bg-reddit-blue/90"
              >
                <Plus className="h-4 w-4" />
                <span>Create Post</span>
              </Button>
            </CardContent>
          </Card>

          {/* Popular Communities */}
          <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Popular Communities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {subreddits.map((subreddit, index) => {
                  const colorClass = communityColors[index % communityColors.length];
                  const memberCount = subreddit.memberCount || 0;
                  const formattedCount = memberCount >= 1000000 
                    ? `${(memberCount / 1000000).toFixed(1)}M` 
                    : memberCount >= 1000 
                    ? `${(memberCount / 1000).toFixed(1)}k` 
                    : memberCount.toString();

                  return (
                    <div
                      key={subreddit.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-reddit-dark rounded-md cursor-pointer"
                    >
                      <div className={`w-8 h-8 ${colorClass} rounded-full flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">
                          {subreddit.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          r/{subreddit.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formattedCount} members
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="bg-white dark:bg-reddit-darker border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                About
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your personal Reddit clone for organizing and discussing topics that matter to you.
              </p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">0</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Posts</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">0</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Comments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>

      <CreatePostDialog 
        open={isCreatePostOpen} 
        onOpenChange={setIsCreatePostOpen} 
      />
    </>
  );
}

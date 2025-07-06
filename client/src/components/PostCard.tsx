import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Share, Bookmark, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import CommentThread from "./CommentThread";
import ShareDialog from "./ShareDialog";
import type { Post } from "@shared/schema";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [userVote, setUserVote] = useState<number | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const queryClient = useQueryClient();

  const voteMutation = useMutation({
    mutationFn: async (voteType: number) => {
      return apiRequest("POST", "/api/votes", {
        userId: "anonymous",
        postId: post.id,
        voteType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const handleVote = (voteType: number) => {
    if (userVote === voteType) {
      setUserVote(null);
      // This would remove the vote
    } else {
      setUserVote(voteType);
      voteMutation.mutate(voteType);
    }
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
        <div className="flex-1 p-4">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-medium text-gray-900 dark:text-white">r/general</span>
            <span className="mx-1">•</span>
            <span>Posted by u/{post.authorUsername}</span>
            <span className="mx-1">•</span>
            <span>{formatTimeAgo(post.createdAt)}</span>
          </div>
          
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-reddit-blue cursor-pointer">
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

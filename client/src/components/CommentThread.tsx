import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Comment } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CommentThreadProps {
  postId: number;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: number) => void;
}

function CommentItem({ comment, onReply }: CommentItemProps) {
  const [userVote, setUserVote] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const voteMutation = useMutation({
    mutationFn: async (voteType: number) => {
      return apiRequest("POST", "/api/votes", {
        userId: "user", // Server will get user from session
        commentId: comment.id,
        voteType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", comment.postId, "comments"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Login Required",
          description: "You need to login to vote on comments",
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
        description: "You need to login to vote on comments",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (userVote === voteType) {
      setUserVote(null);
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

  const avatarColors = [
    "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-blue-500", 
    "bg-red-500", "bg-yellow-500", "bg-pink-500", "bg-indigo-500"
  ];
  const avatarColor = avatarColors[comment.id % avatarColors.length];

  return (
    <div id={`comment-${comment.id}`} className={(comment.depth || 0) > 0 ? "comment-line" : ""}>
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 ${avatarColor} rounded-full flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">
              {comment.authorUsername.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="font-medium text-gray-900 dark:text-white">
              u/{comment.authorUsername}
            </span>
            <span>{formatTimeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {comment.content}
          </p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(1)}
                className={`p-1 ${
                  userVote === 1 
                    ? "text-reddit-orange" 
                    : "text-gray-400 hover:text-reddit-orange"
                }`}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <span className={`text-xs font-medium ${
                userVote === 1 ? "text-reddit-orange" : 
                userVote === -1 ? "text-blue-500" : 
                "text-gray-600 dark:text-gray-400"
              }`}>
                {comment.votes || 0}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(-1)}
                className={`p-1 ${
                  userVote === -1 
                    ? "text-blue-500" 
                    : "text-gray-400 hover:text-blue-500"
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment.id)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-reddit-blue font-medium"
              >
                Reply
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommentThread({ postId }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/posts", postId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (commentData: { content: string; parentId?: number }) => {
      return apiRequest("POST", "/api/comments", {
        content: commentData.content,
        authorUsername: user?.firstName || user?.email || "anonymous",
        postId,
        parentId: commentData.parentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Login Required",
          description: "You need to login to add comments",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "You need to login to add comments",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (newComment.trim()) {
      commentMutation.mutate({ content: newComment });
    }
  };

  const handleSubmitReply = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "You need to login to reply to comments",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (replyContent.trim() && replyingTo) {
      commentMutation.mutate({ content: replyContent, parentId: replyingTo });
    }
  };

  const organizeComments = (comments: Comment[]) => {
    const commentMap = new Map<number, Comment & { replies: Comment[] }>();
    const rootComments: (Comment & { replies: Comment[] })[] = [];

    // Initialize all comments with replies array
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Organize into tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const renderComment = (comment: Comment & { replies: Comment[] }) => (
    <div key={comment.id} className="space-y-4">
      <CommentItem comment={comment} onReply={setReplyingTo} />
      
      {replyingTo === comment.id && (
        <div className="ml-11 space-y-2">
          <Textarea
            placeholder="Add a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="resize-none focus:ring-2 focus:ring-reddit-blue focus:border-transparent"
            rows={3}
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitReply}
              disabled={!replyContent.trim() || commentMutation.isPending}
              className="bg-reddit-blue text-white hover:bg-reddit-blue/90"
            >
              Reply
            </Button>
          </div>
        </div>
      )}
      
      {comment.replies.length > 0 && (
        <div className="space-y-4">
          {comment.replies.map((reply) => renderComment(reply as Comment & { replies: Comment[] }))}
        </div>
      )}
    </div>
  );

  const organizedComments = organizeComments(comments);

  return (
    <div>
      {isAuthenticated ? (
        <div className="mb-4">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full resize-none focus:ring-2 focus:ring-reddit-blue focus:border-transparent"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || commentMutation.isPending}
              className="bg-reddit-blue text-white hover:bg-reddit-blue/90"
            >
              Comment
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Login to add comments and join the discussion
          </p>
          <Button
            onClick={() => window.location.href = "/api/login"}
            className="bg-reddit-blue text-white hover:bg-reddit-blue/90"
          >
            Login
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {organizedComments.map(renderComment)}
      </div>
    </div>
  );
}

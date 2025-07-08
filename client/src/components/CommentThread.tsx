import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Comment } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface CommentThreadProps {
  postId: number;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: number) => void;
  postId: number;
}

function CommentItem({ comment, onReply, postId }: CommentItemProps) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

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

  // Check if current user owns this comment
  const isOwner = user && (
    comment.authorUsername === user.id ||
    comment.authorUsername === user.email ||
    comment.authorUsername === user.firstName ||
    comment.authorUsername === (user.firstName || user.email)
  );

  // Check if comment is deleted
  const isDeleted = comment.content === "Comment deleted by user";

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Comment updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleEditSubmit = () => {
    if (editContent.trim()) {
      editCommentMutation.mutate(editContent.trim());
    }
  };

  const handleEditCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate();
    }
  };

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
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">
                u/{comment.authorUsername}
              </span>
              <span>{formatTimeAgo(comment.createdAt)}</span>
              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                <span className="text-gray-400">(edited)</span>
              )}
            </div>
            
            {/* Edit/Delete Menu for Owner */}
            {isOwner && isAuthenticated && !isDeleted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600 dark:text-red-400">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Comment Content or Edit Form */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] resize-none"
                placeholder="Edit your comment..."
              />
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleEditSubmit}
                  disabled={editCommentMutation.isPending || !editContent.trim()}
                >
                  {editCommentMutation.isPending ? "Updating..." : "Update"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditCancel}
                  disabled={editCommentMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className={`mb-2 ${isDeleted ? "text-gray-400 dark:text-gray-500 italic" : "text-gray-700 dark:text-gray-300"}`}>
              {comment.content}
            </p>
          )}
          
          {/* Action Buttons */}
          {!isEditing && (
            <div className="flex items-center space-x-4">
              {isAuthenticated && !isDeleted && (
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
          )}
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
      // Invalidate profile page comments query
      queryClient.invalidateQueries({ queryKey: ["/api/comments/all"] });
      // Invalidate user comment status for this post
      queryClient.invalidateQueries({ queryKey: ["/api/comments/user-commented", postId] });
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
      <CommentItem comment={comment} onReply={setReplyingTo} postId={postId} />
      
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

import { useState } from "react";
import { Copy, Facebook, Twitter, Mail, MessageCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: number;
  postTitle: string;
}

export default function ShareDialog({ open, onOpenChange, postId, postTitle }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // Create the share URL - using current location for the base URL
  const shareUrl = `${window.location.origin}/?post=${postId}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(postTitle);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The post link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The post link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOptions = [
    {
      name: "Copy Link",
      icon: copied ? Check : Copy,
      onClick: handleCopyLink,
      className: copied ? "text-green-600" : "text-gray-600 dark:text-gray-400",
    },
    {
      name: "Twitter",
      icon: Twitter,
      onClick: () => window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, "_blank"),
      className: "text-blue-400",
    },
    {
      name: "Facebook",
      icon: Facebook,
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank"),
      className: "text-blue-600",
    },
    {
      name: "Email",
      icon: Mail,
      onClick: () => window.open(`mailto:?subject=${encodedTitle}&body=Check out this post: ${encodedUrl}`, "_blank"),
      className: "text-gray-600 dark:text-gray-400",
    },
    {
      name: "Messages",
      icon: MessageCircle,
      onClick: () => window.open(`sms:?body=${encodedTitle} ${encodedUrl}`, "_blank"),
      className: "text-green-600",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Copy Link Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Share link
            </label>
            <div className="flex space-x-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 bg-gray-50 dark:bg-reddit-dark"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className="px-3"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Share to
            </label>
            <div className="grid grid-cols-5 gap-2">
              {shareOptions.map((option) => (
                <Button
                  key={option.name}
                  variant="ghost"
                  size="sm"
                  onClick={option.onClick}
                  className="flex flex-col items-center space-y-1 h-auto py-3 hover:bg-gray-100 dark:hover:bg-reddit-dark"
                >
                  <option.icon className={`h-6 w-6 ${option.className}`} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {option.name}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
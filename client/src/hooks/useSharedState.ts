import { useState, useEffect } from 'react';

// Global state to track which post's link was shared most recently
let globalSharedPostId: number | null = null;
let listeners: Set<(postId: number | null) => void> = new Set();

export function useSharedState() {
  const [sharedPostId, setSharedPostId] = useState<number | null>(globalSharedPostId);

  useEffect(() => {
    const listener = (postId: number | null) => {
      setSharedPostId(postId);
    };
    
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setSharedPost = (postId: number | null) => {
    globalSharedPostId = postId;
    listeners.forEach(listener => listener(postId));
  };

  return {
    sharedPostId,
    setSharedPost,
    isShared: (postId: number) => sharedPostId === postId
  };
}
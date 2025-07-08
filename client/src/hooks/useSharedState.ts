import { useState, useEffect } from 'react';

// Global state to track which post's link was shared most recently
let globalSharedPostId: number | null = null;
let listeners: Set<(postId: number | null) => void> = new Set();

// Global state to track sort preference
let globalSortBy: string = "new";
let sortListeners: Set<(sortBy: string) => void> = new Set();

export function useSharedState() {
  const [sharedPostId, setSharedPostId] = useState<number | null>(globalSharedPostId);
  const [sortBy, setSortBy] = useState<string>(globalSortBy);

  useEffect(() => {
    // Load sort preference from localStorage on mount
    const storedSort = localStorage.getItem("sortBy");
    if (storedSort) {
      globalSortBy = storedSort;
      setSortBy(storedSort);
    }

    const listener = (postId: number | null) => {
      setSharedPostId(postId);
    };
    
    const sortListener = (newSortBy: string) => {
      setSortBy(newSortBy);
    };
    
    listeners.add(listener);
    sortListeners.add(sortListener);
    
    return () => {
      listeners.delete(listener);
      sortListeners.delete(sortListener);
    };
  }, []);

  const setSharedPost = (postId: number | null) => {
    globalSharedPostId = postId;
    listeners.forEach(listener => listener(postId));
  };

  const updateSortBy = (newSort: string) => {
    globalSortBy = newSort;
    localStorage.setItem("sortBy", newSort);
    sortListeners.forEach(listener => listener(newSort));
  };

  return {
    sharedPostId,
    setSharedPost,
    isShared: (postId: number) => sharedPostId === postId,
    sortBy,
    updateSortBy,
  };
}
import { useState } from "react";

export function useComments() {
  const [comments, setComments] = useState([]);

  function addComment(comment) {
    const id = crypto.randomUUID();

    const newComment = {
      id,
      ...comment,
    };

    setComments(prev => [...prev.slice(-3), newComment]);

    setTimeout(() => {
      setComments(prev => prev.filter(c => c.id !== id));
    }, 15000);
  }

  return { comments, addComment };
}
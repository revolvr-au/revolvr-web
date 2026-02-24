import { useComments } from "./useComments";

export default function CommentRail() {
  const { comments } = useComments();

  return (
    <div className="absolute left-4 bottom-36 flex flex-col gap-3 z-20">
      {comments.map(comment => (
        <div
          key={comment.id}
          className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white shadow-lg transition-opacity duration-500"
        >
          <span className="font-semibold">{comment.username}:</span>{" "}
          {comment.message}
        </div>
      ))}
    </div>
  );
}
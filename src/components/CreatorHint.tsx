type Props = {
  message: string | null;
};

export default function CreatorHint({ message }: Props) {
  if (!message) return null;

  return (
    <div className="absolute bottom-32 left-4 z-30 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs text-white/80 backdrop-blur-md">
      {message}
    </div>
  );
}

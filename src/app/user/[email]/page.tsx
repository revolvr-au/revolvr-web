export default function UserPage({ params }: { params: { email: string } }) {
  return (
    <div className="p-6 text-white">
      <h1>User: {params.email}</h1>
    </div>
  );
}
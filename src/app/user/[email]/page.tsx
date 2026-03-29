export default function UserPage({ params }: { params: { email: string } }) {
  return (
    <div className="text-white p-10">
      <h1 className="text-2xl">User</h1>
      <p>{params.email}</p>
    </div>
  );
}
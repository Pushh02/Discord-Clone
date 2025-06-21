import { SignIn } from "@clerk/nextjs";
 
export default function Page() {
  return (
    <>
      <SignIn />
      <div className="text-center text-sm text-gray-500">
        dummy credentials: <br />
        email: test@test.com <br />
        password: test123
      </div>
    </>
  );
}
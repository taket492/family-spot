import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="text-sm text-gray-600">読み込み中...</div>;
  }

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">
          こんにちは、{session.user.name || session.user.email}さん
        </span>
        <button
          onClick={() => signOut()}
          className="text-sm text-red-600 hover:text-red-800"
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Link 
        href="/auth/signin"
        className="text-sm text-green-600 hover:text-green-800"
      >
        ログイン
      </Link>
      <Link 
        href="/auth/signup"
        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
      >
        新規登録
      </Link>
    </div>
  );
}
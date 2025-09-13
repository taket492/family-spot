import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { callbackUrl } = router.query;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('メールアドレスまたはパスワードが間違っています');
      } else if (result?.ok) {
        // ログイン成功時の処理を改善
        const redirectUrl = (callbackUrl as string) || '/';
        
        // セッションが確実に更新されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // ページをリフレッシュしてからリダイレクト
        window.location.href = redirectUrl;
      }
    } catch (err) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>ログイン - Family Weekend</title>
      </Head>
      
      <div className="max-w-md w-full">
        <Card className="p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-lg mb-4 animate-bounce-soft">
              <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden className="text-white">
                <circle cx="24" cy="26" r="3" fill="currentColor" />
                <circle cx="40" cy="26" r="3" fill="currentColor" />
                <path d="M22 40c4 4 16 4 20 0" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              ログイン
            </h2>
            <p className="mt-2 text-neutral-600">
              アカウントにログインしてください
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              アカウントをお持ちでない方は{' '}
              <Link href="/auth/signup" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                新規登録
              </Link>
            </p>
          </div>
        
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="パスワードを入力してください"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>

            <div className="text-center">
              <Link href="/" className="text-primary-600 hover:text-primary-500 font-medium transition-colors">
                ← ホームに戻る
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
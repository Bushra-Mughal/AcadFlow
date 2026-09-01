import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft, Mail } from 'lucide-react';
import { LoginBackground } from '@/components/auth/LoginBackground';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      toast.error('Please enter your username');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(trimmed);
      setSent(true);
    } catch (error: any) {
      console.error('Reset password error:', error);
      // Always show success to avoid revealing whether username exists
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <LoginBackground />
      <div className="relative z-10 w-full max-w-md">
        <Card className="backdrop-blur-sm bg-card/90 border-border/60 shadow-sm">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl text-balance">
                {sent ? 'Check your inbox' : 'Forgot password?'}
              </CardTitle>
              <CardDescription className="text-pretty">
                {sent
                  ? 'If that username exists, a reset link has been sent to its linked email.'
                  : 'Enter your AcadFlow username and we\'ll send a reset link.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {sent ? (
              <div className="flex flex-col items-center gap-6 py-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-center text-sm text-muted-foreground text-pretty">
                  Open the email and click the reset link. It may take a minute to arrive. Check your spam folder if you don't see it.
                </p>
                <div className="flex flex-col items-center gap-2 w-full">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setSent(false); setUsername(''); }}
                  >
                    Try a different username
                  </Button>
                  <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="Enter your AcadFlow username"
                    disabled={loading}
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll send a reset link to the email linked to your account.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sendingâ€¦' : 'Send reset link'}
                </Button>

                <div className="flex justify-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { GraduationCap, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { LoginBackground } from '@/components/auth/LoginBackground';
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, signIn, signInWithGoogle, checkUsernameAvailable } = useAuth();
  const [username, setUsername] = useState('');
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!username) { setUsernameStatus('idle'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setUsernameStatus('invalid'); return; }
    if (username.length < 3) { setUsernameStatus('idle'); return; }

    setUsernameStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const available = await checkUsernameAvailable(username);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, checkUsernameAvailable]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!username.trim() || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (usernameStatus === 'invalid') {
      toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }
    if (usernameStatus === 'taken') {
      toast.error('That username is already taken');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!agreedToTerms) {
      toast.error('Please agree to the User Agreement and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      await signUp(username, password, gmail);
      toast.success('Account created successfully');
      await signIn(username, password);
      navigate('/');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!agreedToTerms) {
      toast.error('Please agree to the User Agreement and Privacy Policy first');
      return;
    }
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google sign-up error:', error);
      toast.error(error.message || 'Failed to sign up with Google');
      setGoogleLoading(false);
    }
  }

  const usernameHint = () => {
    if (usernameStatus === 'checking') return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking availabilityâ€¦
      </span>
    );
    if (usernameStatus === 'available') return (
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Username is available
      </span>
    );
    if (usernameStatus === 'taken') return (
      <span className="flex items-center gap-1 text-destructive">
        <XCircle className="h-3 w-3" /> Username already taken
      </span>
    );
    if (usernameStatus === 'invalid') return (
      <span className="flex items-center gap-1 text-destructive">
        <XCircle className="h-3 w-3" /> Only letters, numbers, and underscores
      </span>
    );
    return <span className="text-muted-foreground">Used to invite you to team projects</span>;
  };

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
              <CardTitle className="text-2xl text-balance">Create Your Account</CardTitle>
              <CardDescription className="text-pretty">Join AcadFlow to manage your academic work</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Terms */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                disabled={loading || googleLoading}
              />
              <label htmlFor="terms" className="text-sm leading-snug peer-disabled:opacity-70">
                I agree to the{' '}
                <span className="text-primary">User Agreement</span> and{' '}
                <span className="text-primary">Privacy Policy</span>
              </label>
            </div>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
            >
              <GoogleIcon />
              {googleLoading ? 'Redirectingâ€¦' : 'Continue with Google'}
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or create with username</span>
              <Separator className="flex-1" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="Choose a unique username"
                  disabled={loading}
                  required
                  className={
                    usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-destructive focus-visible:ring-destructive'
                      : usernameStatus === 'available'
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : ''
                  }
                />
                <p className="text-xs">{usernameHint()}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gmail">
                  Gmail Address
                  <span className="ml-1 text-muted-foreground font-normal">(optional â€” links your Google login)</span>
                </Label>
                <Input
                  id="gmail"
                  type="email"
                  value={gmail}
                  onChange={(e) => setGmail(e.target.value.trim().toLowerCase())}
                  placeholder="you@gmail.com"
                  disabled={loading}
                  autoComplete="email"
                />
                <p className="text-xs text-muted-foreground">
                  Add your Gmail so "Continue with Google" recognises your AcadFlow username.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    disabled={loading}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthBar password={password} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    disabled={loading}
                    required
                    className={`pr-10 ${confirmPassword && confirmPassword !== password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || googleLoading || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
              >
                {loading ? 'Creating accountâ€¦' : 'Sign Up'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




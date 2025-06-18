'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type LoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectPath?: string;
  onSuccess?: () => void;
};

export function LoginDialog({ open, onOpenChange, redirectPath, onSuccess }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'You have been logged in successfully.',
        variant: 'default',
      });

      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      } else if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    onOpenChange(false);
    router.push(`/signup?redirect=${encodeURIComponent(redirectPath || '/')}`);
  };

  const handleForgotPassword = () => {
    onOpenChange(false);
    router.push('/reset-password');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Sign in to continue</DialogTitle>
          <DialogDescription className="text-gray-300">
            Please sign in to join this workshop.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-900/30 rounded-md">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={handleSignUp}
              className="font-medium text-indigo-400 hover:text-indigo-300"
            >
              Sign up
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

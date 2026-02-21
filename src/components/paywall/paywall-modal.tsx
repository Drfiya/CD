'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PaywallModalProps {
  isOpen: boolean;
}

export function PaywallModal({ isOpen }: PaywallModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubscribe = async () => {
    if (!session?.user?.id) {
      // If somehow not authenticated, redirect to register
      router.push('/register');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-8">
        <div className="text-center space-y-6">
          {/* Heading */}
          <h2 className="text-2xl font-bold text-foreground">
            Become a Member
          </h2>

          {/* Description */}
          <p className="text-muted-foreground">
            Join our community to access all content, courses, and events.
          </p>

          {/* Plan display box */}
          <div className="bg-muted rounded-lg p-6 space-y-2">
            <p className="font-semibold text-foreground">
              Community Membership
            </p>
            <p className="text-3xl font-bold text-primary">
              $89<span className="text-lg font-normal text-muted-foreground">/month</span>
            </p>
          </div>

          {/* Stripe trust badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure payment powered by Stripe
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? 'Redirecting to Stripe...' : 'Subscribe Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}

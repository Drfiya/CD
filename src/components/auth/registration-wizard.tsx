'use client';

import { useState } from 'react';
import { type RegisterInput } from '@/lib/validations/auth';
import { registerWithMembership } from '@/lib/auth-actions';
import { StepIndicator } from './step-indicator';
import { RegistrationStepAccount } from './registration-step-account';
import { RegistrationStepPayment } from './registration-step-payment';
import { RegistrationSuccess } from './registration-success';

type Step = 'account' | 'payment' | 'success';

export function RegistrationWizard() {
  const [step, setStep] = useState<Step>('account');
  const [accountData, setAccountData] = useState<RegisterInput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccountComplete = (data: RegisterInput) => {
    setAccountData(data);
    setStep('payment');
    setError(null);
  };

  const handlePaymentComplete = async (promoCode?: string) => {
    if (!accountData) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Register the user (membership created as EXPIRED until payment confirmed)
      const result = await registerWithMembership(accountData);

      if ('error' in result) {
        setIsProcessing(false);
        const firstError = Object.values(result.error)[0]?.[0];
        setError(firstError || 'Registration failed. Please try again.');
        setStep('account');
        return;
      }

      // Step 2: Create Stripe Checkout session and redirect
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: result.userId,
          email: accountData.email,
          promoCode, // Pass promo code for server-side resolution
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setIsProcessing(false);
      setError(err instanceof Error ? err.message : 'Payment setup failed. Please try again.');
    }
  };

  const handleBack = () => {
    setStep('account');
    setError(null);
  };

  return (
    <div>
      <StepIndicator currentStep={step} />

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {step === 'account' && (
        <RegistrationStepAccount
          onComplete={handleAccountComplete}
          defaultValues={accountData || undefined}
        />
      )}

      {step === 'payment' && (
        <RegistrationStepPayment
          onComplete={handlePaymentComplete}
          onBack={handleBack}
          isProcessing={isProcessing}
        />
      )}

      {step === 'success' && accountData && (
        <RegistrationSuccess
          email={accountData.email}
          password={accountData.password}
        />
      )}
    </div>
  );
}

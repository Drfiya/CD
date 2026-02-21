'use client';

import { Button } from '@/components/ui/button';

interface RegistrationStepPaymentProps {
  onComplete: () => void;
  onBack: () => void;
  isProcessing: boolean;
}

export function RegistrationStepPayment({
  onComplete,
  onBack,
  isProcessing,
}: RegistrationStepPaymentProps) {
  return (
    <div className="space-y-6">
      {/* Plan Card */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Community Membership</h3>
            <p className="text-gray-600 text-sm mt-1">
              Full access to all community features, courses, and events
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">$89</span>
            <span className="text-gray-600">/month</span>
          </div>
        </div>
      </div>

      {/* What's included */}
      <ul className="space-y-2 text-sm text-gray-700">
        <li className="flex items-center gap-2">
          <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Unlimited community discussions
        </li>
        <li className="flex items-center gap-2">
          <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Full course library access
        </li>
        <li className="flex items-center gap-2">
          <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Events calendar and registration
        </li>
        <li className="flex items-center gap-2">
          <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Cancel anytime — no commitment
        </li>
      </ul>

      {/* Stripe trust badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Secure payment powered by Stripe
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onComplete}
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Redirecting to Stripe...
            </span>
          ) : (
            'Proceed to Checkout'
          )}
        </Button>
      </div>
    </div>
  );
}

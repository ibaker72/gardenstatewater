'use client';

import type { ReactNode } from 'react';
import type { CustomerType } from '@/lib/validation/delivery-request';
import { scrollToSection, useLandingFlow } from './landing-context';

/**
 * A CTA that starts (or re-enters) the delivery request flow, optionally
 * preselecting home/business so the visitor lands on step one with the right
 * option already chosen.
 */
export function FlowCtaButton({
  customerType,
  className,
  children,
}: {
  customerType?: CustomerType;
  className: string;
  children: ReactNode;
}) {
  const { mergePrefill } = useLandingFlow();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (customerType) mergePrefill({ customerType });
        scrollToSection('request-service');
      }}
    >
      {children}
    </button>
  );
}

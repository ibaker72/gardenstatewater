'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CustomerType } from '@/lib/validation/delivery-request';
import type { ServiceAreaStatus } from '@/lib/service-area';

/**
 * Carries the availability-check result into the delivery request flow so the
 * visitor never types their ZIP twice. The provider wraps the whole page but
 * server-rendered children pass straight through — only the checker and the
 * flow subscribe.
 */
export interface FlowPrefill {
  zip?: string;
  customerType?: CustomerType;
  serviceAreaStatus?: ServiceAreaStatus;
}

interface LandingFlowValue {
  prefill: FlowPrefill;
  mergePrefill: (update: FlowPrefill) => void;
}

const LandingFlowContext = createContext<LandingFlowValue | null>(null);

export function LandingFlowProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefill] = useState<FlowPrefill>({});
  const mergePrefill = useCallback((update: FlowPrefill) => {
    setPrefill((current) => ({ ...current, ...update }));
  }, []);
  const value = useMemo(() => ({ prefill, mergePrefill }), [prefill, mergePrefill]);
  return <LandingFlowContext.Provider value={value}>{children}</LandingFlowContext.Provider>;
}

export function useLandingFlow(): LandingFlowValue {
  const value = useContext(LandingFlowContext);
  if (!value) throw new Error('useLandingFlow must be used inside LandingFlowProvider');
  return value;
}

/** Smooth-scroll to a landing-page section (CSS handles reduced motion). */
export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

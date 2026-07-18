import type { Metadata } from 'next';
import { siteConfig } from '@/config/site-config';
import { LegalPage } from '@/components/marketing/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The basic terms that apply when you request delivery from ${siteConfig.businessName}.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage heading="Terms of Service">
      <p>
        Submitting a delivery request on this website is not a purchase and does not create a
        delivery commitment. We confirm availability, pricing, bottle requirements, and scheduling
        with you personally before any service begins or anything is charged.
      </p>
      <p>
        Service availability varies by route and may change as we expand. We may decline or
        discontinue service where we cannot deliver reliably.
      </p>
      <p>
        Details of your specific service — including pricing, delivery schedule, bottle or
        equipment terms, and payment options — are agreed during onboarding and shown in your
        customer account.
      </p>
      <p>
        To change, pause, or cancel your service, contact us before your next scheduled route date
        and we will help adjust your account.
      </p>
    </LegalPage>
  );
}

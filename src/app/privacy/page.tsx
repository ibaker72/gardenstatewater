import type { Metadata } from 'next';
import { siteConfig } from '@/config/site-config';
import { LegalPage } from '@/components/marketing/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${siteConfig.businessName} handles the information you share with us.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage heading="Privacy Policy">
      <p>
        {siteConfig.businessName} collects the information you choose to share with us — such as
        your name, contact details, address, and delivery preferences — when you request service,
        check availability, or use the customer portal.
      </p>
      <p>
        We use this information only to evaluate and provide water delivery service: confirming
        availability, contacting you about your request, scheduling deliveries, and managing your
        account. We do not sell your personal information.
      </p>
      <p>
        Payment processing, email delivery, and hosting are performed by the service providers we
        use to operate the business; they receive only the information needed to perform those
        functions.
      </p>
      <p>
        To review, update, or delete the information we hold about you, contact us using the
        details listed on our homepage and we will help directly.
      </p>
    </LegalPage>
  );
}

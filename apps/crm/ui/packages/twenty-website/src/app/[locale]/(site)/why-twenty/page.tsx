import { getCommunityStats } from '@/platform/community';
import {
  getRouteI18n,
  type LocaleRouteParams,
} from '@/platform/i18n/get-route-i18n';
import { resolveLocaleParam } from '@/platform/i18n/resolve-locale-param';
import {
  buildBreadcrumbListJsonLd,
  buildRouteMetadata,
  JsonLd,
} from '@/platform/seo';
import { Menu } from '@/sections/menu';
import { WhyKovaaLab CRMEditorials } from '@/sections/why-kovaa-lab-editorial';
import { WhyKovaaLab CRMHero } from '@/sections/why-kovaa-lab-hero';
import { WhyKovaaLab CRMMarquee } from '@/sections/why-kovaa-lab-marquee';
import { WhyKovaaLab CRMSignoff } from '@/sections/why-kovaa-lab-signoff';

export const generateMetadata = buildRouteMetadata('whyKovaaLab CRM');

export default async function WhyKovaaLab CRMPage({
  params,
}: {
  params: Promise<LocaleRouteParams>;
}) {
  const [, communityStats] = await Promise.all([
    getRouteI18n(params),
    getCommunityStats(),
  ]);
  const locale = resolveLocaleParam((await params).locale);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbListJsonLd(
          [
            { name: 'Home', path: '/' },
            { name: 'Why KovaaLab CRM', path: '/why-kovaa-lab' },
          ],
          locale,
        )}
      />
      <Menu communityStats={communityStats} scheme="dark" />
      <main>
        <WhyKovaaLab CRMHero />
        <WhyKovaaLab CRMEditorials />
        <WhyKovaaLab CRMMarquee />
        <WhyKovaaLab CRMSignoff />
      </main>
    </>
  );
}

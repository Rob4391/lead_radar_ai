import { Injectable, Logger } from '@nestjs/common';
import { classifyPerformanceScore, extractInternalLinks, hasViewportMetaTag, isSlowLoad, isWebsiteOld } from './checks';

export interface AuditResult {
    websiteAgeYears: number | null;
    isOldWebsite: boolean;
    mobileFriendly: boolean;
    isSlowLoad: boolean;
    hasBrokenPages: boolean;
}

const PAGESPEED_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    private async getWebsiteAge(website: string): Promise<{ ageYears: number | null; isOld: boolean }> {
        try {
            // Stripping the scheme matters: Wayback often only has old http:// snapshots
            // and won't match an https:// query against them. timestamp=19960101 biases
            // the "closest" match toward the earliest snapshot on record, since the API
            // otherwise defaults to the snapshot closest to now.
            const bareUrl = website.replace(/^https?:\/\//i, '');
            const res = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(bareUrl)}&timestamp=19960101`);
            if (!res.ok) return { ageYears: null, isOld: false };
            const data: any = await res.json();
            const timestamp = data?.archived_snapshots?.closest?.timestamp ?? null;
            return isWebsiteOld(timestamp);
        } catch (err) {
            this.logger.warn(`Wayback lookup failed for ${website}: ${(err as Error).message}`);
            return { ageYears: null, isOld: false };
        }
    }

    private async getHomepageHtml(website: string): Promise<string | null> {
        try {
            const res = await fetch(website);
            if (!res.ok) return null;
            return await res.text();
        } catch (err) {
            this.logger.warn(`Homepage fetch failed for ${website}: ${(err as Error).message}`);
            return null;
        }
    }

    private async hasBrokenInternalLinks(website: string, html: string): Promise<boolean> {
        const links = extractInternalLinks(html, website);
        for (const link of links) {
            try {
                const res = await fetch(link, { method: 'HEAD' });
                if (res.status >= 400) return true;
            } catch {
                return true;
            }
        }
        return false;
    }

    private async getPerformance(website: string): Promise<{ isSlow: boolean }> {
        const apiKey = process.env.PAGESPEED_API_KEY;
        if (!apiKey) return { isSlow: false };
        try {
            const url = `${PAGESPEED_URL}?url=${encodeURIComponent(website)}&key=${apiKey}&strategy=mobile`;
            const res = await fetch(url);
            if (!res.ok) return { isSlow: false };
            const data: any = await res.json();
            const score = data?.lighthouseResult?.categories?.performance?.score ?? null;
            const slowBySCore = classifyPerformanceScore(score);

            const loadTimeMs = data?.lighthouseResult?.audits?.['speed-index']?.numericValue ?? null;
            const slowByTime = typeof loadTimeMs === 'number' ? isSlowLoad(loadTimeMs) : null;

            return { isSlow: Boolean(slowBySCore ?? slowByTime ?? false) };
        } catch (err) {
            this.logger.warn(`PageSpeed lookup failed for ${website}: ${(err as Error).message}`);
            return { isSlow: false };
        }
    }

    async auditWebsite(website: string): Promise<AuditResult> {
        const [ageResult, html, perf] = await Promise.all([
            this.getWebsiteAge(website),
            this.getHomepageHtml(website),
            this.getPerformance(website),
        ]);

        const mobileFriendly = html ? hasViewportMetaTag(html) : false;
        const hasBrokenPages = html ? await this.hasBrokenInternalLinks(website, html) : false;

        return {
            websiteAgeYears: ageResult.ageYears,
            isOldWebsite: ageResult.isOld,
            mobileFriendly,
            isSlowLoad: perf.isSlow,
            hasBrokenPages,
        };
    }
}

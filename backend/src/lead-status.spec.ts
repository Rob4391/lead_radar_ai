import { isLeadStatus } from './lead-status';

describe('isLeadStatus', () => {
    it('accepts each known status', () => {
        expect(isLeadStatus('NEW')).toBe(true);
        expect(isLeadStatus('CONTACTED')).toBe(true);
        expect(isLeadStatus('REPLIED')).toBe(true);
        expect(isLeadStatus('WON')).toBe(true);
        expect(isLeadStatus('LOST')).toBe(true);
    });

    it('rejects an unknown or wrongly-cased value', () => {
        expect(isLeadStatus('won')).toBe(false);
        expect(isLeadStatus('MAYBE')).toBe(false);
        expect(isLeadStatus(undefined)).toBe(false);
        expect(isLeadStatus(5)).toBe(false);
    });
});

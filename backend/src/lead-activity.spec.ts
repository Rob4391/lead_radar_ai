import { mergeActivities } from './lead-activity';

describe('mergeActivities', () => {
    it('gives every lead default activity when the user has none', () => {
        const [lead] = mergeActivities([{ id: 1, name: 'Cafe' }], []);
        expect(lead).toMatchObject({ id: 1, name: 'Cafe', status: 'NEW', notes: null, coldEmail: null, proposal: null });
    });

    it("overlays the user's own activity onto the matching lead only", () => {
        const result = mergeActivities(
            [{ id: 1 }, { id: 2 }],
            [{ leadId: 2, status: 'WON', notes: 'Signed', coldEmail: 'hi' }],
        );
        expect(result[0]).toMatchObject({ id: 1, status: 'NEW', notes: null });
        expect(result[1]).toMatchObject({ id: 2, status: 'WON', notes: 'Signed', coldEmail: 'hi' });
    });

    it('does not copy unrelated activity columns (ids, userId) onto the lead', () => {
        const [lead] = mergeActivities([{ id: 1 }], [{ leadId: 1, status: 'CONTACTED', userId: 'u1', id: 99 } as any]);
        expect(lead.id).toBe(1);
        expect((lead as any).userId).toBeUndefined();
    });
});

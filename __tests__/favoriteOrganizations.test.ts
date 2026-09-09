import {
  favoriteUpdate,
  organizationQueryParams,
  toOrganizationSummaries,
} from '../src/store/api/favoriteOrganizations';

/**
 * The favourite gym and team.
 *
 * Both are `Organization` refs, so one list and one picker answer both. That
 * makes *which field is being written* the only thing separating them - and
 * that is exactly what these hold down, because picking the wrong one is
 * invisible on screen: the two lists are identical.
 */

describe('the organization list a picker reads', () => {
  it('searches server-side and caps what it asks for', () => {
    // The full list is unbounded and this runs on a phone: fetching it whole to
    // filter locally is the shape that works in development and falls over once
    // the data is real.
    expect(organizationQueryParams({ search: 'athletics', limit: 30 })).toEqual({
      search: 'athletics',
      limit: 30,
    });
  });

  it('omits a blank search rather than sending one', () => {
    // An empty term must mean "the first page", not "match the empty string".
    expect(organizationQueryParams({ search: '   ' }).search).toBeUndefined();
    expect(organizationQueryParams({}).search).toBeUndefined();
    expect(organizationQueryParams().search).toBeUndefined();
  });

  it('trims what the user typed', () => {
    expect(organizationQueryParams({ search: '  athletics ' }).search).toBe('athletics');
  });

  it('always asks for a bounded page', () => {
    expect(organizationQueryParams().limit).toBe(30);
    expect(organizationQueryParams({ limit: 5 }).limit).toBe(5);
  });
});

describe('reshaping organizations for a card', () => {
  it('keeps what a card renders and drops the rest', () => {
    const rows = toOrganizationSummaries({
      data: [
        {
          _id: 'org-1',
          name: 'Cheer Athletics',
          shortName: 'CA',
          logoUrl: 'https://cdn/ca.png',
          location: 'Plano, TX',
          // Admin bookkeeping. A coach's name has no business on a profile.
          coachName: 'Someone',
          directorName: 'Someone Else',
        },
      ],
    });

    expect(rows[0]).toEqual({
      id: 'org-1',
      name: 'Cheer Athletics',
      shortName: 'CA',
      logoUrl: 'https://cdn/ca.png',
      location: 'Plano, TX',
    });
  });

  it('accepts either id field, since the API sends _id', () => {
    expect(toOrganizationSummaries([{ id: 'org-2', name: 'B' }])[0].id).toBe('org-2');
    expect(toOrganizationSummaries([{ _id: 'org-3', name: 'C' }])[0].id).toBe('org-3');
  });

  it('reads a missing logo or location as absent rather than undefined', () => {
    const [row] = toOrganizationSummaries([{ _id: 'org-4', name: 'D' }]);

    expect(row.logoUrl).toBeNull();
    expect(row.location).toBeNull();
  });

  it('reads nothing as an empty list rather than throwing', () => {
    expect(toOrganizationSummaries({ data: [] })).toEqual([]);
    expect(toOrganizationSummaries(undefined)).toEqual([]);
    expect(toOrganizationSummaries(null)).toEqual([]);
    // A failed request can hand back an object where a list was expected.
    expect(toOrganizationSummaries({ message: 'nope' })).toEqual([]);
  });
});

describe('writing a favourite', () => {
  it('sends the gym under its own field', () => {
    expect(favoriteUpdate('favoriteOrganizationId', 'org-1')).toEqual({
      favoriteOrganizationId: 'org-1',
    });
  });

  it('sends the team under a different field', () => {
    // The whole reason one picker can serve both: the field is the difference.
    expect(favoriteUpdate('favoriteTeamId', 'org-1')).toEqual({
      favoriteTeamId: 'org-1',
    });
  });

  it('sends null to clear one, rather than omitting it', () => {
    const body = favoriteUpdate('favoriteTeamId', null);

    // Omitting a field leaves it alone, which is how every other partial update
    // behaves - so an omission could never un-set a favourite.
    expect('favoriteTeamId' in body).toBe(true);
    expect(body.favoriteTeamId).toBeNull();
  });

  it('touches only the favourite being set', () => {
    const body = favoriteUpdate('favoriteOrganizationId', 'org-1');

    // Setting a gym must not blank the team, which is what sending both fields
    // on every save would do.
    expect(Object.keys(body)).toEqual(['favoriteOrganizationId']);
  });

  it('lets the same organization be both', () => {
    // A single-team gym is a real thing. The two writes are independent, so
    // nothing here needs to know about the other field to allow it.
    expect(favoriteUpdate('favoriteOrganizationId', 'org-1').favoriteOrganizationId).toBe(
      'org-1',
    );
    expect(favoriteUpdate('favoriteTeamId', 'org-1').favoriteTeamId).toBe('org-1');
  });
});

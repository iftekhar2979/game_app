import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('lucide-react-native', () => {
  const MockReact = require('react');
  const { View: MockView } = require('react-native');
  const Icon = () => MockReact.createElement(MockView);
  return new Proxy({}, { get: () => Icon });
});

jest.mock('react-redux', () => ({
  useSelector: (fn: any) => fn({ auth: { user: { role: 'admin' } } }),
  useDispatch: () => jest.fn(),
}));

jest.mock('../src/utils/toast', () => ({
  showToast: { success: jest.fn(), error: jest.fn() },
}));

let mockDashboard: any;
let mockDivisions: any;
let mockCompetitions: any;
let mockEntries: any;

const stubMutation = () => [jest.fn(), { isLoading: false }];

jest.mock('../src/store/api/adminCheerApi', () => ({
  useGetAdminCheerDashboardQuery: () => ({ data: mockDashboard }),
  useGetAdminCheerDivisionsQuery: () => ({ data: mockDivisions }),
  useGetAdminCheerCompetitionsQuery: () => ({ data: mockCompetitions }),
  useGetAdminCompetitionEntriesQuery: () => ({ data: mockEntries }),
  useCreateAdminSeasonMutation: stubMutation,
  useCreateAdminOrganizationMutation: stubMutation,
  useCreateAdminCheerDivisionMutation: stubMutation,
  useCreateAdminCheerCompetitionMutation: stubMutation,
  useCreateAdminSeasonCheerTeamMutation: stubMutation,
  useRegisterAdminCompetitionEntryMutation: stubMutation,
  useScoreAdminCheerPerformanceMutation: stubMutation,
}));

import AdminCheerFormScreen from '../src/screens/Admin/AdminCheerFormScreen';

const STEPS = [
  'season',
  'organization',
  'division',
  'competition',
  'fantasyTeam',
  'entry',
  'score',
] as const;

const renderStep = async (step: string) => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <AdminCheerFormScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() } as any}
        route={{ params: { step } } as any}
      />,
    );
  });
  return JSON.stringify(renderer.toJSON());
};

beforeEach(() => {
  mockDashboard = {
    referenceData: {
      seasons: [{ _id: 's1', name: 'Season', status: 'registration_open' }],
      organizations: [{ _id: 'o1', name: 'Example All Stars' }],
    },
  };
  mockDivisions = [{ _id: 'd1', code: 'SMALL', name: 'Small' }];
  mockCompetitions = [];
  mockEntries = [];
});

describe('AdminCheerFormScreen', () => {
  it.each(STEPS)('renders the %s step with normal data', async step => {
    expect((await renderStep(step)).length).toBeGreaterThan(200);
  });

  // Regression: a list endpoint returning null or an envelope object used to
  // reach `.map` unguarded and blank the entire screen - including the
  // Country / program step, which does not otherwise use divisions at all.
  const awkward: Array<[string, any]> = [
    ['null', null],
    ['an items envelope', { items: [] }],
    ['a data envelope', { data: [] }],
    ['an unrelated object', { message: 'no divisions' }],
    ['a string', 'nope'],
  ];

  describe.each(awkward)('when divisions come back as %s', (_label, value) => {
    it.each(STEPS)('still renders the %s step', async step => {
      mockDivisions = value;
      expect((await renderStep(step)).length).toBeGreaterThan(200);
    });
  });

  describe.each(awkward)(
    'when dashboard reference lists come back as %s',
    (_label, value) => {
      it.each(STEPS)('still renders the %s step', async step => {
        mockDashboard = {
          referenceData: { seasons: value, organizations: value },
        };
        expect((await renderStep(step)).length).toBeGreaterThan(200);
      });
    },
  );

  it('still renders when competitions and entries are not arrays', async () => {
    mockCompetitions = null;
    mockEntries = { items: null };
    expect((await renderStep('entry')).length).toBeGreaterThan(200);
    expect((await renderStep('score')).length).toBeGreaterThan(200);
  });
});

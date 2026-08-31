import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, ShieldAlert } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootStackParamList } from '../../../App';
import { RootState } from '../../store';
import {
  useCreateAdminCheerCompetitionMutation,
  useCreateAdminCheerDivisionMutation,
  useCreateAdminOrganizationMutation,
  useCreateAdminSeasonCheerTeamMutation,
  useCreateAdminSeasonMutation,
  useGetAdminCheerCompetitionsQuery,
  useGetAdminCheerDashboardQuery,
  useGetAdminCheerDivisionsQuery,
  useGetAdminCompetitionEntriesQuery,
  useRegisterAdminCompetitionEntryMutation,
  useScoreAdminCheerPerformanceMutation,
} from '../../store/api/adminCheerApi';
import { showToast } from '../../utils/toast';
import {
  calculateCheerFantasyPoints,
  CHEER_DIVISIONS,
} from '../../utils/cheerScoring';

export type AdminCheerStep =
  | 'season'
  | 'organization'
  | 'division'
  | 'competition'
  | 'fantasyTeam'
  | 'entry'
  | 'score';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminCheerForm'>;

const titles: Record<AdminCheerStep, { title: string; subtitle: string }> = {
  season: { title: 'Create season', subtitle: 'Step 1 · operating calendar' },
  organization: {
    title: 'Add cheer program',
    subtitle: 'Step 2 · real-world organization',
  },
  division: {
    title: 'Create division',
    subtitle: 'Step 3 · draft roster category',
  },
  competition: {
    title: 'Create competition',
    subtitle: 'Step 5 · event calendar',
  },
  fantasyTeam: {
    title: 'Add cheer team',
    subtitle: 'Step 4 · draftable real team',
  },
  entry: {
    title: 'Register event entry',
    subtitle: 'Step 6 · real team and division',
  },
  score: {
    title: 'Enter official result',
    subtitle: 'Step 7 · calculate fantasy points',
  },
};

const getId = (value: any) => String(value?._id ?? value?.id ?? value ?? '');
const labelFor = (value: any) =>
  value?.name ?? value?.teamName ?? value?.code ?? 'Unnamed';
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (days: number) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return dateOnly(value);
};
const toIso = (value: string, endOfDay = false) => {
  const suffix = endOfDay ? 'T23:59:59.000Z' : 'T00:00:00.000Z';
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}${suffix}` : value,
  );
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date.toISOString();
};
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: any) {
  return (
    <View className="mb-4">
      <Text className="text-gray-400 text-xs mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#666"
        keyboardType={keyboardType}
        multiline={multiline}
        className={`bg-[#171717] border border-white/15 rounded-xl px-4 text-white ${
          multiline ? 'min-h-[100px] py-3' : 'h-12'
        }`}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function ChoiceList({
  label,
  items,
  selectedId,
  onSelect,
  emptyText = 'Nothing available yet.',
}: any) {
  return (
    <View className="mb-4">
      <Text className="text-gray-400 text-xs mb-2">{label}</Text>
      {items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {items.map((item: any) => {
            const id = getId(item);
            const selected = id === selectedId;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => onSelect(id)}
                className={`mr-2 px-4 py-3 rounded-xl border ${
                  selected
                    ? 'bg-[#E0B566] border-[#E0B566]'
                    : 'bg-[#171717] border-white/15'
                }`}
              >
                <Text
                  className={
                    selected ? 'text-black font-semibold' : 'text-white'
                  }
                >
                  {labelFor(item)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text className="text-gray-600 py-2">{emptyText}</Text>
      )}
    </View>
  );
}

export default function AdminCheerFormScreen({ navigation, route }: Props) {
  const step = route.params.step;
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const [seasonId, setSeasonId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [competitionId, setCompetitionId] = useState('');
  const [entryId, setEntryId] = useState('');
  const [form, setForm] = useState<Record<string, string>>({
    name: '',
    shortName: '',
    location: '',
    organizationType: 'all_star_gym',
    registrationStartsAt: addDays(1),
    registrationEndsAt: addDays(30),
    startsAt: addDays(31),
    endsAt: addDays(180),
    code: CHEER_DIVISIONS[0].code,
    level: 'Level 1',
    ageGroup: 'Senior',
    governingBody: 'USASF',
    minimumTeamSize: '1',
    maximumTeamSize: '36',
    maximumScore: '100',
    venue: '',
    city: '',
    country: 'United States',
    fantasyPeriod: '1',
    teamName: '',
    openingValue: '10',
    performanceOrder: '1',
    round: 'preliminary',
    officialScore: '95',
    otherTeamsInDivision: '2',
    placement: '1',
    hitZero: 'yes',
    grandChampion: 'no',
  });
  const set = (key: string) => (value: string) =>
    setForm(current => ({ ...current, [key]: value }));

  const { data: dashboard } = useGetAdminCheerDashboardQuery(undefined);
  const seasons = dashboard?.referenceData?.seasons ?? [];
  const organizations = dashboard?.referenceData?.organizations ?? [];
  const { data: divisions = [] } = useGetAdminCheerDivisionsQuery(seasonId, {
    skip: !seasonId,
  });
  const { data: competitions = [] } = useGetAdminCheerCompetitionsQuery(
    seasonId,
    { skip: !seasonId },
  );
  const { data: entries = [] } = useGetAdminCompetitionEntriesQuery(
    competitionId,
    { skip: !competitionId },
  );

  useEffect(() => {
    if (!seasonId && seasons.length) setSeasonId(getId(seasons[0]));
  }, [seasonId, seasons]);
  useEffect(() => {
    if (
      seasonId &&
      divisions.length &&
      !divisions.some(item => getId(item) === divisionId)
    )
      setDivisionId(getId(divisions[0]));
  }, [divisionId, divisions, seasonId]);
  useEffect(() => {
    if (
      seasonId &&
      competitions.length &&
      !competitions.some(item => getId(item) === competitionId)
    )
      setCompetitionId(getId(competitions[0]));
  }, [competitionId, competitions, seasonId]);
  useEffect(() => {
    if (
      organizations.length &&
      !organizations.some(item => getId(item) === organizationId)
    )
      setOrganizationId(getId(organizations[0]));
  }, [organizationId, organizations]);
  useEffect(() => {
    if (
      competitionId &&
      entries.length &&
      !entries.some(item => getId(item) === entryId)
    )
      setEntryId(getId(entries[0]));
  }, [competitionId, entries, entryId]);

  const selectedCompetition = useMemo(
    () => competitions.find(item => getId(item) === competitionId),
    [competitionId, competitions],
  );
  const selectedSeason = useMemo(
    () => seasons.find(item => getId(item) === seasonId),
    [seasonId, seasons],
  );
  useEffect(() => {
    if (
      step !== 'competition' ||
      !selectedSeason?.startsAt ||
      !selectedSeason?.endsAt
    )
      return;
    const startsAt = new Date(selectedSeason.startsAt);
    const nextDay = new Date(startsAt);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const seasonEnd = new Date(selectedSeason.endsAt);
    setForm(current => ({
      ...current,
      startsAt: dateOnly(startsAt),
      endsAt: dateOnly(nextDay <= seasonEnd ? nextDay : seasonEnd),
    }));
  }, [selectedSeason, step]);
  useEffect(() => {
    if (!selectedCompetition) return;
    const offered = selectedCompetition.divisionIds ?? [];
    if (
      offered.length &&
      !offered.some((item: any) => getId(item) === divisionId)
    )
      setDivisionId(getId(offered[0]));
  }, [divisionId, selectedCompetition]);

  const [createSeason, seasonState] = useCreateAdminSeasonMutation();
  const [createOrganization, organizationState] =
    useCreateAdminOrganizationMutation();
  const [createDivision, divisionState] = useCreateAdminCheerDivisionMutation();
  const [createCompetition, competitionState] =
    useCreateAdminCheerCompetitionMutation();
  const [createSeasonTeam, teamState] = useCreateAdminSeasonCheerTeamMutation();
  const [registerEntry, entryState] =
    useRegisterAdminCompetitionEntryMutation();
  const [scorePerformance, scoreState] =
    useScoreAdminCheerPerformanceMutation();
  const isSaving = [
    seasonState,
    organizationState,
    divisionState,
    competitionState,
    teamState,
    entryState,
    scoreState,
  ].some(state => state.isLoading);

  const requireValue = (value: string, message: string) => {
    if (!value?.trim()) throw new Error(message);
    return value.trim();
  };

  const submit = async () => {
    try {
      let result: any;
      if (step === 'season') {
        result = await createSeason({
          name: requireValue(form.name, 'Season name is required'),
          status: 'draft',
          registrationStartsAt: toIso(form.registrationStartsAt),
          registrationEndsAt: toIso(form.registrationEndsAt, true),
          startsAt: toIso(form.startsAt),
          endsAt: toIso(form.endsAt, true),
        }).unwrap();
      } else if (step === 'organization') {
        const name = requireValue(form.name, 'Program name is required');
        result = await createOrganization({
          name,
          normalizedName: name.toLowerCase(),
          shortName: form.shortName.trim() || undefined,
          country: requireValue(form.country, 'Country is required'),
          organizationType: form.organizationType.trim() || 'all_star_gym',
        }).unwrap();
      } else if (step === 'division') {
        const selectedDivision = CHEER_DIVISIONS.find(
          division => division.code === form.code,
        );
        result = await createDivision({
          seasonId: requireValue(seasonId, 'Create or select a season first'),
          code: requireValue(
            selectedDivision?.code || form.code,
            'Division is required',
          ),
          name: requireValue(
            selectedDivision?.name || form.name,
            'Division is required',
          ),
          discipline: 'cheer',
          level: requireValue(form.level, 'Level is required'),
          ageGroup: requireValue(form.ageGroup, 'Age group is required'),
          genderCategory: 'open',
          minimumTeamSize: Number(form.minimumTeamSize),
          maximumTeamSize: Number(form.maximumTeamSize),
          governingBody: requireValue(
            form.governingBody,
            'Governing body is required',
          ),
          maximumScore: Number(form.maximumScore),
          dropHighLow: true,
          minimumJudgesToDrop: 3,
        }).unwrap();
      } else if (step === 'competition') {
        result = await createCompetition({
          seasonId: requireValue(seasonId, 'Select a season'),
          divisionIds: [
            requireValue(divisionId, 'Create or select a division'),
          ],
          name: requireValue(form.name, 'Competition name is required'),
          governingBody: requireValue(
            form.governingBody,
            'Governing body is required',
          ),
          venue: form.venue.trim() || undefined,
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
          startsAt: toIso(form.startsAt),
          endsAt: toIso(form.endsAt, true),
          fantasyPeriod: Number(form.fantasyPeriod),
          status: 'draft',
        }).unwrap();
      } else if (step === 'fantasyTeam') {
        result = await createSeasonTeam({
          seasonId: requireValue(seasonId, 'Select a season'),
          organizationId: requireValue(
            organizationId,
            'Create or select a program',
          ),
          teamName: requireValue(form.teamName, 'Team name is required'),
          eligibleDivisionIds: [requireValue(divisionId, 'Select a division')],
          openingValue: Number(form.openingValue),
          isEligible: true,
        }).unwrap();
      } else if (step === 'entry') {
        result = await registerEntry({
          competitionId: requireValue(
            competitionId,
            'Create or select a competition',
          ),
          body: {
            divisionId: requireValue(divisionId, 'Select a division'),
            organizationId: requireValue(organizationId, 'Select a program'),
            teamName: requireValue(form.teamName, 'Team name is required'),
            performanceOrder: Number(form.performanceOrder),
            status: 'confirmed',
          },
        }).unwrap();
      } else {
        const officialScore = Number(form.officialScore);
        if (
          !Number.isFinite(officialScore) ||
          officialScore < 0 ||
          officialScore > 100
        ) {
          throw new Error('Official score must be between 0 and 100');
        }
        const otherTeamsInDivision = Math.max(
          0,
          Math.floor(Number(form.otherTeamsInDivision) || 0),
        );
        const placement = Math.max(1, Math.floor(Number(form.placement) || 1));
        if (placement > otherTeamsInDivision + 1) {
          throw new Error(
            'Placement cannot exceed the total number of teams in the division',
          );
        }
        const fantasyScoring = calculateCheerFantasyPoints({
          officialScore,
          otherTeamsInDivision,
          wonDivision: placement === 1,
          finishedLast:
            otherTeamsInDivision >= 2 &&
            placement === otherTeamsInDivision + 1,
          hitZero: form.hitZero === 'yes',
          grandChampion: form.grandChampion === 'yes',
        });
        result = await scorePerformance({
          entryId: requireValue(entryId, 'Create or select an event entry'),
          body: {
            round: form.round,
            categoryScores: [
              {
                code: 'OFFICIAL_SCORE',
                label: 'Official score',
                judgeScores: [officialScore],
                maximumPoints: 100,
              },
            ],
            deductions: [],
            isHitZero: form.hitZero === 'yes',
            placement,
            otherTeamsInDivision,
            isGrandChampion: form.grandChampion === 'yes',
            fantasyPoints: fantasyScoring.totalPoints,
            fantasyPointsBreakdown: fantasyScoring,
          },
        }).unwrap();
      }
      showToast.success(
        'Saved',
        step === 'score'
          ? 'Score is ready for review and publishing.'
          : `${titles[step].title} completed.`,
      );
      if (result) navigation.goBack();
    } catch (requestError: any) {
      showToast.error(
        'Could not save',
        requestError?.data?.message ||
          requestError?.message ||
          'Check the form and try again.',
      );
    }
  };

  if (role !== 'admin') {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ShieldAlert color="#E0B566" size={38} />
        <Text className="text-white mt-4">Admin access required</Text>
      </SafeAreaView>
    );
  }

  const showSeason = !['season', 'organization'].includes(step);
  const showOrganization = ['fantasyTeam', 'entry'].includes(step);
  const showDivision = ['competition', 'fantasyTeam', 'entry'].includes(step);
  const showCompetition = ['entry', 'score'].includes(step);
  const scorePreview = (() => {
    if (step !== 'score') return null;
    const officialScore = Number(form.officialScore);
    const otherTeamsInDivision = Math.max(
      0,
      Math.floor(Number(form.otherTeamsInDivision) || 0),
    );
    const placement = Math.max(1, Math.floor(Number(form.placement) || 1));
    try {
      return calculateCheerFantasyPoints({
        officialScore,
        otherTeamsInDivision,
        wonDivision: placement === 1,
        finishedLast:
          otherTeamsInDivision >= 2 && placement === otherTeamsInDivision + 1,
        hitZero: form.hitZero === 'yes',
        grandChampion: form.grandChampion === 'yes',
      });
    } catch {
      return null;
    }
  })();

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-5">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl border border-white/20 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={23} />
        </TouchableOpacity>
        <View className="ml-4">
          <Text className="text-white text-xl font-semibold">
            {titles[step].title}
          </Text>
          <Text className="text-[#E0B566] text-xs mt-0.5">
            {titles[step].subtitle.toUpperCase()}
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        {showSeason && (
          <ChoiceList
            label="Season"
            items={seasons}
            selectedId={seasonId}
            onSelect={setSeasonId}
            emptyText="Complete Step 1 first."
          />
        )}
        {showCompetition && (
          <ChoiceList
            label="Competition"
            items={competitions}
            selectedId={competitionId}
            onSelect={setCompetitionId}
            emptyText="Complete Step 4 first."
          />
        )}
        {showDivision && (
          <ChoiceList
            label="Division"
            items={
              step === 'entry' && selectedCompetition?.divisionIds?.length
                ? selectedCompetition.divisionIds
                : divisions
            }
            selectedId={divisionId}
            onSelect={setDivisionId}
            emptyText="Complete Step 3 first."
          />
        )}
        {showOrganization && (
          <ChoiceList
            label="Program"
            items={organizations}
            selectedId={organizationId}
            onSelect={setOrganizationId}
            emptyText="Complete Step 2 first."
          />
        )}
        {step === 'score' && (
          <ChoiceList
            label="Event entry"
            items={entries}
            selectedId={entryId}
            onSelect={setEntryId}
            emptyText="Complete Step 6 first."
          />
        )}

        {step === 'season' && (
          <>
            <Field
              label="Season name"
              value={form.name}
              onChangeText={set('name')}
              placeholder="2026–27 Fantasy Cheer"
            />
            <Field
              label="Registration opens (YYYY-MM-DD)"
              value={form.registrationStartsAt}
              onChangeText={set('registrationStartsAt')}
            />
            <Field
              label="Registration closes (YYYY-MM-DD)"
              value={form.registrationEndsAt}
              onChangeText={set('registrationEndsAt')}
            />
            <Field
              label="Season starts (YYYY-MM-DD)"
              value={form.startsAt}
              onChangeText={set('startsAt')}
            />
            <Field
              label="Season ends (YYYY-MM-DD)"
              value={form.endsAt}
              onChangeText={set('endsAt')}
            />
          </>
        )}
        {step === 'organization' && (
          <>
            <Field
              label="Program / gym name"
              value={form.name}
              onChangeText={set('name')}
              placeholder="Example All Stars"
            />
            <Field
              label="Short name"
              value={form.shortName}
              onChangeText={set('shortName')}
              placeholder="EAS"
            />
            <Field
              label="Country"
              value={form.country}
              onChangeText={set('country')}
              placeholder="United States"
            />
          </>
        )}
        {step === 'division' && (
          <>
            <ChoiceList
              label="Division"
              items={CHEER_DIVISIONS.map(division => ({
                _id: division.code,
                name: division.name,
              }))}
              selectedId={form.code}
              onSelect={(code: string) => {
                const division = CHEER_DIVISIONS.find(
                  item => item.code === code,
                );
                if (division) {
                  setForm(current => ({
                    ...current,
                    code: division.code,
                    name: division.name,
                  }));
                }
              }}
            />
            <Field
              label="Governing body"
              value={form.governingBody}
              onChangeText={set('governingBody')}
            />
          </>
        )}
        {step === 'competition' && (
          <>
            <Field
              label="Competition name"
              value={form.name}
              onChangeText={set('name')}
              placeholder="National Cheer Championship"
            />
            <Field
              label="Governing body"
              value={form.governingBody}
              onChangeText={set('governingBody')}
            />
            <Field
              label="Venue"
              value={form.venue}
              onChangeText={set('venue')}
            />
            <View className="flex-row -mx-1">
              <View className="w-1/2 px-1">
                <Field
                  label="City"
                  value={form.city}
                  onChangeText={set('city')}
                />
              </View>
              <View className="w-1/2 px-1">
                <Field
                  label="Country"
                  value={form.country}
                  onChangeText={set('country')}
                />
              </View>
            </View>
            <Field
              label="Starts (YYYY-MM-DD)"
              value={form.startsAt}
              onChangeText={set('startsAt')}
            />
            <Field
              label="Ends (YYYY-MM-DD)"
              value={form.endsAt}
              onChangeText={set('endsAt')}
            />
            <Field
              label="Fantasy period"
              value={form.fantasyPeriod}
              onChangeText={set('fantasyPeriod')}
              keyboardType="number-pad"
            />
          </>
        )}
        {step === 'fantasyTeam' && (
          <>
            <Field
              label="Real team name"
              value={form.teamName}
              onChangeText={set('teamName')}
              placeholder="Example All Stars Senior"
            />
            <Field
              label="Opening draft / auction value"
              value={form.openingValue}
              onChangeText={set('openingValue')}
              keyboardType="decimal-pad"
            />
          </>
        )}
        {step === 'entry' && (
          <>
            <Field
              label="Team name at this event"
              value={form.teamName}
              onChangeText={set('teamName')}
            />
            <Field
              label="Performance order"
              value={form.performanceOrder}
              onChangeText={set('performanceOrder')}
              keyboardType="number-pad"
            />
          </>
        )}
        {step === 'score' && (
          <>
            <ChoiceList
              label="Round"
              items={[
                { _id: 'preliminary', name: 'Preliminary' },
                { _id: 'semifinal', name: 'Semifinal' },
                { _id: 'final', name: 'Final' },
              ]}
              selectedId={form.round}
              onSelect={set('round')}
            />
            <Field
              label="Official score (0–100)"
              value={form.officialScore}
              onChangeText={set('officialScore')}
              keyboardType="decimal-pad"
            />
            <Field
              label="Other teams in this division"
              value={form.otherTeamsInDivision}
              onChangeText={set('otherTeamsInDivision')}
              keyboardType="number-pad"
            />
            <Field
              label="Final placement"
              value={form.placement}
              onChangeText={set('placement')}
              keyboardType="number-pad"
            />
            <ChoiceList
              label="Hit zero deductions"
              items={[
                { _id: 'yes', name: 'Yes' },
                { _id: 'no', name: 'No' },
              ]}
              selectedId={form.hitZero}
              onSelect={set('hitZero')}
            />
            <ChoiceList
              label="Grand champion"
              items={[
                { _id: 'no', name: 'No' },
                { _id: 'yes', name: 'Yes' },
              ]}
              selectedId={form.grandChampion}
              onSelect={set('grandChampion')}
            />
            {scorePreview && (
              <View className="bg-[#171717] border border-[#E0B566]/40 rounded-2xl p-4 mb-4">
                <Text className="text-gray-400 text-xs">
                  FANTASY POINT PREVIEW
                </Text>
                <Text className="text-[#E0B566] text-3xl font-bold mt-1">
                  {scorePreview.totalPoints} pts
                </Text>
                <Text className="text-gray-500 text-xs mt-2">
                  Score {scorePreview.scorePoints} · division result{' '}
                  {scorePreview.divisionResultPoints} · hit zero{' '}
                  {scorePreview.hitZeroPoints} · grand champion{' '}
                  {scorePreview.grandChampionPoints}
                </Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          disabled={isSaving}
          onPress={submit}
          className={`rounded-2xl py-4 items-center mt-2 ${
            isSaving ? 'bg-[#6f5a32]' : 'bg-[#E0B566]'
          }`}
        >
          {isSaving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-black font-bold">
              {step === 'score' ? 'Save for review' : 'Save and continue'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

import { useState } from 'react';
import { formatDateRange } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrainingPlans } from '@/hooks/useTrainingPlans';
import { useFacilities } from '@/hooks/useFacilities';
import { useFacilityAvailability } from '@/hooks/useFacilityAvailability';
import { useTrainingSlots } from '@/hooks/useTrainingSlots';
import TrainingPlansPage from '@/components/training/TrainingPlansPage';
import FacilitiesPage from '@/components/training/FacilitiesPage';
import FacilityAvailabilityPage from '@/components/training/FacilityAvailabilityPage';
import TrainingSlotsPage from '@/components/training/TrainingSlotsPage';
import TrainingOverview from '@/components/training/TrainingOverview';
import TeamsPage from '@/components/training/TeamsPage';
import PersonsPage from '@/components/training/PersonsPage';
import { Badge } from '@/components/ui/badge';
import TeamOverview from '@/components/training/TeamOverview';
import { Building2, Calendar, Clock, LayoutGrid, Eye, Users, UserRound } from 'lucide-react';

const TrainingSchedule = () => {
  const { data: plans = [] } = useTrainingPlans();
  const { data: facilities = [] } = useFacilities();
  const { data: availability = [] } = useFacilityAvailability();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('plans');

  const activePlan = plans.find(p => p.status === 'active');
  const effectivePlanId = selectedPlanId || activePlan?.id || plans[0]?.id || '';
  const selectedPlan = plans.find(p => p.id === effectivePlanId);
  const sortedPlans = [...plans].sort((a, b) => a.valid_from.localeCompare(b.valid_from) || (a.valid_to ?? '').localeCompare(b.valid_to ?? ''));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Træningstider</h1>
          <p className="page-subtitle">Planlæg og administrér klubbens træningstider</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{facilities.length} faciliteter</span>
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{plans.length} planer</span>
          {activePlan && (
            <Badge variant="default" className="text-xs">Aktiv: {activePlan.name}</Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid print:hidden">
          <TabsTrigger value="plans" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />Planer
          </TabsTrigger>
          <TabsTrigger value="facilities" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />Faciliteter
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />Haltilgængelighed
          </TabsTrigger>
          <TabsTrigger value="master-teams" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />Hold
          </TabsTrigger>
          <TabsTrigger value="persons" className="gap-1.5">
            <UserRound className="h-3.5 w-3.5" />Personer
          </TabsTrigger>
          <TabsTrigger value="slots" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />Træningspas
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />Pr. hold
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />Oversigt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6">
          <TrainingPlansPage onNavigateToSlots={(planId) => { setSelectedPlanId(planId); setActiveTab('slots'); }} />
        </TabsContent>

        <TabsContent value="facilities" className="mt-6">
          <FacilitiesPage availability={availability} />
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          <FacilityAvailabilityPage />
        </TabsContent>

        <TabsContent value="master-teams" className="mt-6">
          <TeamsPage />
        </TabsContent>

        <TabsContent value="persons" className="mt-6">
          <PersonsPage />
        </TabsContent>

        <TabsContent value="slots" className="mt-6">
          {plans.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <span className="text-sm font-medium text-muted-foreground">Plan:</span>
                <Select value={effectivePlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Vælg en plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedPlans.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.name}
                          <Badge variant={p.status === 'active' ? 'default' : p.status === 'draft' ? 'secondary' : 'outline'} className="text-xs">
                            {p.status === 'active' ? 'Aktiv' : p.status === 'draft' ? 'Kladde' : 'Arkiveret'}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPlan && (
                  <span className="text-xs text-muted-foreground">
                    {formatDateRange(selectedPlan.valid_from, selectedPlan.valid_to)}
                  </span>
                )}
              </div>
              {effectivePlanId && <TrainingSlotsPage planId={effectivePlanId} />}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
              Opret en træningsplan først under fanen "Planer"
            </div>
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <TeamsWithPlanSelector plans={plans} facilities={facilities} effectivePlanId={effectivePlanId} selectedPlanId={selectedPlanId} setSelectedPlanId={setSelectedPlanId} />
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <OverviewWithPlanSelector plans={plans} facilities={facilities} effectivePlanId={effectivePlanId} selectedPlanId={selectedPlanId} setSelectedPlanId={setSelectedPlanId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

function OverviewWithPlanSelector({ plans, facilities, effectivePlanId, selectedPlanId, setSelectedPlanId }: {
  plans: any[]; facilities: any[]; effectivePlanId: string; selectedPlanId: string; setSelectedPlanId: (id: string) => void;
}) {
  const { data: overviewSlots = [] } = useTrainingSlots(effectivePlanId);
  const selectedPlan = plans.find((p: any) => p.id === effectivePlanId);
  const sortedPlans = [...plans].sort((a: any, b: any) => a.valid_from.localeCompare(b.valid_from) || (a.valid_to ?? '').localeCompare(b.valid_to ?? ''));

  if (plans.length === 0) {
    return <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">Opret en træningsplan først under fanen "Planer"</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 print:hidden">
        <span className="text-sm font-medium text-muted-foreground">Plan:</span>
        <Select value={effectivePlanId} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Vælg en plan" /></SelectTrigger>
          <SelectContent>
            {sortedPlans.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  {p.name}
                  <Badge variant={p.status === 'active' ? 'default' : p.status === 'draft' ? 'secondary' : 'outline'} className="text-xs">
                    {p.status === 'active' ? 'Aktiv' : p.status === 'draft' ? 'Kladde' : 'Arkiveret'}
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedPlan && effectivePlanId && (
        <TrainingOverview plan={selectedPlan} slots={overviewSlots} facilities={facilities} />
      )}
    </div>
  );
}


function TeamsWithPlanSelector({ plans, facilities, effectivePlanId, selectedPlanId, setSelectedPlanId }: {
  plans: any[]; facilities: any[]; effectivePlanId: string; selectedPlanId: string; setSelectedPlanId: (id: string) => void;
}) {
  const { data: teamSlots = [] } = useTrainingSlots(effectivePlanId);
  const sortedPlans = [...plans].sort((a: any, b: any) => a.valid_from.localeCompare(b.valid_from) || (a.valid_to ?? '').localeCompare(b.valid_to ?? ''));

  if (plans.length === 0) {
    return <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">Opret en træningsplan først under fanen "Planer"</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <span className="text-sm font-medium text-muted-foreground">Plan:</span>
        <Select value={effectivePlanId} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Vælg en plan" /></SelectTrigger>
          <SelectContent>
            {sortedPlans.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  {p.name}
                  <Badge variant={p.status === 'active' ? 'default' : p.status === 'draft' ? 'secondary' : 'outline'} className="text-xs">
                    {p.status === 'active' ? 'Aktiv' : p.status === 'draft' ? 'Kladde' : 'Arkiveret'}
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {effectivePlanId && <TeamOverview slots={teamSlots} facilities={facilities} />}
    </div>
  );
}

export default TrainingSchedule;

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrainingPlans } from '@/hooks/useTrainingPlans';
import TrainingPlansPage from '@/components/training/TrainingPlansPage';
import FacilitiesPage from '@/components/training/FacilitiesPage';
import FacilityAvailabilityPage from '@/components/training/FacilityAvailabilityPage';
import TrainingSlotsPage from '@/components/training/TrainingSlotsPage';

const TrainingSchedule = () => {
  const { data: plans = [] } = useTrainingPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Auto-select active plan
  const activePlan = plans.find(p => p.status === 'active');
  const effectivePlanId = selectedPlanId || activePlan?.id || plans[0]?.id || '';

  return (
    <div>
      <h1 className="page-header">Træningstider</h1>
      <p className="page-subtitle">Planlæg og administrér klubbens træningstider</p>

      <Tabs defaultValue="plans" className="mt-6">
        <TabsList>
          <TabsTrigger value="plans">Planer</TabsTrigger>
          <TabsTrigger value="facilities">Faciliteter</TabsTrigger>
          <TabsTrigger value="availability">Haltilgængelighed</TabsTrigger>
          <TabsTrigger value="slots">Træningspas</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6">
          <TrainingPlansPage />
        </TabsContent>

        <TabsContent value="facilities" className="mt-6">
          <FacilitiesPage />
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          <FacilityAvailabilityPage />
        </TabsContent>

        <TabsContent value="slots" className="mt-6">
          {plans.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Vælg plan:</span>
                <Select value={effectivePlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Vælg en plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.status === 'active' ? '(Aktiv)' : p.status === 'draft' ? '(Kladde)' : '(Arkiveret)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {effectivePlanId && <TrainingSlotsPage planId={effectivePlanId} />}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
              Opret en træningsplan først
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingSchedule;

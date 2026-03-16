import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrainingPlan } from '@/types/training';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function useTrainingPlans() {
  return useQuery({
    queryKey: ['training_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_plans' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as TrainingPlan[]) ?? [];
    },
  });
}

export function useCreateTrainingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Omit<TrainingPlan, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('training_plans' as any)
        .insert({ ...plan, created_by: user?.id ?? null } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TrainingPlan;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training_plans'] }); toast.success('Plan oprettet'); },
    onError: (e: any) => handleMutationError(e, 'Der opstod en fejl ved oprettelse af planen.'),
  });
}

export function useUpdateTrainingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_plans' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TrainingPlan;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training_plans'] }); toast.success('Plan opdateret'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke opdatere planen. Prøv igen.'),
  });
}

export function useDeleteTrainingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('training_plans' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training_plans'] }); toast.success('Plan slettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke slette planen. Prøv igen.'),
  });
}

export function usePublishPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      // First archive current active plan
      await supabase
        .from('training_plans' as any)
        .update({ status: 'archived' } as any)
        .eq('status', 'active');
      // Then activate the draft
      const { error } = await supabase
        .from('training_plans' as any)
        .update({ status: 'active' } as any)
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training_plans'] }); toast.success('Plan publiceret som aktiv'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke publicere planen. Prøv igen.'),
  });
}

export function useCopyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sourcePlanId: string) => {
      // Get the source plan
      const { data: source, error: fetchErr } = await supabase
        .from('training_plans' as any)
        .select('*')
        .eq('id', sourcePlanId)
        .single();
      if (fetchErr) throw fetchErr;
      const s = source as unknown as TrainingPlan;

      // Create new draft plan
      const { data: newPlan, error: createErr } = await supabase
        .from('training_plans' as any)
        .insert({
          name: `${s.name} (kopi)`,
          description: s.description,
          status: 'draft',
          valid_from: s.valid_from,
          valid_to: s.valid_to,
        } as any)
        .select()
        .single();
      if (createErr) throw createErr;
      const np = newPlan as unknown as TrainingPlan;

      // Copy all slots
      const { data: slots, error: slotsErr } = await supabase
        .from('training_slots' as any)
        .select('*')
        .eq('training_plan_id', sourcePlanId);
      if (slotsErr) throw slotsErr;

      if (slots && (slots as any[]).length > 0) {
        const newSlots = (slots as any[]).map(({ id, training_plan_id, created_at, updated_at, ...rest }: any) => ({
          ...rest,
          training_plan_id: np.id,
        }));
        const { error: insertErr } = await supabase.from('training_slots' as any).insert(newSlots as any);
        if (insertErr) throw insertErr;
      }

      return np;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training_plans'] });
      qc.invalidateQueries({ queryKey: ['training_slots'] });
      toast.success('Plan kopieret som ny draft');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

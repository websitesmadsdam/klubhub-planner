import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrainingSlot } from '@/types/training';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function useTrainingSlots(planId?: string) {
  return useQuery({
    queryKey: ['training_slots', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_slots' as any)
        .select('*')
        .eq('training_plan_id', planId!)
        .order('weekday')
        .order('start_time');
      if (error) throw error;
      return (data as unknown as TrainingSlot[]) ?? [];
    },
  });
}

export function useCreateTrainingSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slot: Omit<TrainingSlot, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('training_slots' as any)
        .insert(slot as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TrainingSlot;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training_slots'] }); toast.success('Træningspas oprettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke oprette træningspas. Prøv igen.'),
  });
}

export function useUpdateTrainingSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingSlot> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_slots' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TrainingSlot;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training_slots'] }); toast.success('Træningspas opdateret'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke opdatere træningspas. Prøv igen.'),
  });
}

export function useDeleteTrainingSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('training_slots' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training_slots'] }); toast.success('Træningspas slettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke slette træningspas. Prøv igen.'),
  });
}

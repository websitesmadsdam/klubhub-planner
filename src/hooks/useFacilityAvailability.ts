import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FacilityAvailability } from '@/types/training';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function useFacilityAvailability(facilityId?: string) {
  return useQuery({
    queryKey: ['facility_availability', facilityId],
    queryFn: async () => {
      let query = supabase.from('facility_availability' as any).select('*').order('weekday').order('start_time');
      if (facilityId) query = query.eq('facility_id', facilityId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as FacilityAvailability[]) ?? [];
    },
  });
}

export function useCreateFacilityAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (av: Omit<FacilityAvailability, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('facility_availability' as any)
        .insert(av as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FacilityAvailability;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facility_availability'] }); toast.success('Tilgængelighed oprettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke oprette tilgængelighed. Prøv igen.'),
  });
}

export function useUpdateFacilityAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FacilityAvailability> & { id: string }) => {
      const { data, error } = await supabase
        .from('facility_availability' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FacilityAvailability;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facility_availability'] }); toast.success('Tilgængelighed opdateret'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke opdatere tilgængelighed. Prøv igen.'),
  });
}

export function useDeleteFacilityAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase.from('facility_availability' as any).delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      if (count === 0) throw new Error('permission denied');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facility_availability'] }); toast.success('Tilgængelighed slettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke slette tilgængelighed. Prøv igen.'),
  });
}

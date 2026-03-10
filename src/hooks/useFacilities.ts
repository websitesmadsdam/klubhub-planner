import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Facility } from '@/types/training';
import { toast } from 'sonner';

export function useFacilities() {
  return useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return (data as unknown as Facility[]) ?? [];
    },
  });
}

export function useCreateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (facility: Omit<Facility, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('facilities' as any)
        .insert(facility as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Facility;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facilities'] }); toast.success('Facilitet oprettet'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Facility> & { id: string }) => {
      const { data, error } = await supabase
        .from('facilities' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Facility;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facilities'] }); toast.success('Facilitet opdateret'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('facilities' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facilities'] }); toast.success('Facilitet slettet'); },
    onError: (e: any) => toast.error(e.message),
  });
}

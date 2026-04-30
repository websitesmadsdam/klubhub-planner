import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Team } from '@/types/training';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams' as any)
        .select('*')
        .order('birth_year_from', { ascending: false })
        .order('abbreviation');
      if (error) throw error;
      return (data as unknown as Team[]) ?? [];
    },
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (team: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('teams' as any)
        .insert(team as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Team;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); toast.success('Hold oprettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke oprette hold. Prøv igen.'),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Team> & { id: string }) => {
      const { data, error } = await supabase
        .from('teams' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Team;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); toast.success('Hold opdateret'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke opdatere hold. Prøv igen.'),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase.from('teams' as any).delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      if (count === 0) throw new Error('permission denied');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); qc.invalidateQueries({ queryKey: ['person_team_roles'] }); toast.success('Hold slettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke slette hold. Prøv igen.'),
  });
}

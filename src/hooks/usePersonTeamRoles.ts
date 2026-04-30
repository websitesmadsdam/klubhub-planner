import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PersonTeamRole } from '@/types/training';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function usePersonTeamRoles() {
  return useQuery({
    queryKey: ['person_team_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('person_team_roles' as any)
        .select('*')
        .order('created_at');
      if (error) throw error;
      return (data as unknown as PersonTeamRole[]) ?? [];
    },
  });
}

export function useCreatePersonTeamRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: Omit<PersonTeamRole, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('person_team_roles' as any)
        .insert(role as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PersonTeamRole;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['person_team_roles'] }); toast.success('Kobling oprettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke oprette kobling. Prøv igen.'),
  });
}

export function useUpdatePersonTeamRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PersonTeamRole> & { id: string }) => {
      const { data, error } = await supabase
        .from('person_team_roles' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PersonTeamRole;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['person_team_roles'] }); toast.success('Kobling opdateret'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke opdatere kobling. Prøv igen.'),
  });
}

export function useDeletePersonTeamRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase.from('person_team_roles' as any).delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      if (count === 0) throw new Error('permission denied');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['person_team_roles'] }); toast.success('Kobling slettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke slette kobling. Prøv igen.'),
  });
}

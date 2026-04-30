import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Person } from '@/types/training';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function usePersons() {
  return useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('persons' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return (data as unknown as Person[]) ?? [];
    },
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (person: Omit<Person, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('persons' as any)
        .insert(person as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Person;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['persons'] }); toast.success('Person oprettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke oprette person. Prøv igen.'),
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Person> & { id: string }) => {
      const { data, error } = await supabase
        .from('persons' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Person;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['persons'] }); toast.success('Person opdateret'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke opdatere person. Prøv igen.'),
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase.from('persons' as any).delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      if (count === 0) throw new Error('permission denied');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['persons'] }); qc.invalidateQueries({ queryKey: ['person_team_roles'] }); toast.success('Person slettet'); },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke slette person. Prøv igen.'),
  });
}

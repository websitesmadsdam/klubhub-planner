import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskTemplate } from '@/types/tasks';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function useTaskTemplates() {
  return useQuery({
    queryKey: ['task_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates' as any)
        .select('*')
        .order('title');
      if (error) throw error;
      return (data as unknown as TaskTemplate[]) ?? [];
    },
  });
}

export function useCreateTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('task_templates' as any)
        .insert(template as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TaskTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task_templates'] });
      toast.success('Skabelon oprettet');
    },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke oprette skabelon.'),
  });
}

export function useUpdateTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaskTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('task_templates' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TaskTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task_templates'] });
      toast.success('Skabelon opdateret');
    },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke opdatere skabelon.'),
  });
}

export function useDeleteTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase
        .from('task_templates' as any)
        .delete({ count: 'exact' })
        .eq('id', id);
      if (error) throw error;
      if (count === 0) throw new Error('permission denied');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task_templates'] });
      toast.success('Skabelon slettet');
    },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke slette skabelon.'),
  });
}

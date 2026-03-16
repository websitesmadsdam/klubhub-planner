import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Task, TaskParticipant } from '@/types/tasks';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks' as any)
        .select('*, responsible:profiles!tasks_responsible_user_id_fkey(id, full_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as Task[]) ?? [];
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks' as any)
        .select('*, responsible:profiles!tasks_responsible_user_id_fkey(id, full_name, email)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as Task;
    },
  });
}

export function useTaskParticipants(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task_participants', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_participants' as any)
        .select('*, profile:profiles!task_participants_user_id_fkey(id, full_name, email)')
        .eq('task_id', taskId!);
      if (error) throw error;
      return (data as unknown as TaskParticipant[]) ?? [];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Record<string, any>) => {
      const { data, error } = await supabase
        .from('tasks' as any)
        .insert(task as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Opgave oprettet');
    },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke oprette opgave.'),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase
        .from('tasks' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Opgave opdateret');
    },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke opdatere opgave.'),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase
        .from('tasks' as any)
        .delete({ count: 'exact' })
        .eq('id', id);
      if (error) throw error;
      if (count === 0) throw new Error('permission denied');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Opgave slettet');
    },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke slette opgave.'),
  });
}

export function useSetTaskParticipants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, userIds }: { taskId: string; userIds: string[] }) => {
      // Delete existing
      await supabase.from('task_participants' as any).delete().eq('task_id', taskId);
      // Insert new
      if (userIds.length > 0) {
        const { error } = await supabase
          .from('task_participants' as any)
          .insert(userIds.map(uid => ({ task_id: taskId, user_id: uid })) as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task_participants', vars.taskId] });
    },
    onError: (e: any) => handleMutationError(e, 'Kunne ikke opdatere deltagere.'),
  });
}

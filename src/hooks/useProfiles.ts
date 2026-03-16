import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

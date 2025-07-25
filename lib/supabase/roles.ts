import { createClient } from '@/utils/supabase/server';

export const isInstructor = async (userId: string): Promise<boolean> => {
    if (!userId) return false;

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'instructor');

    if (error) {
        console.error("Error checking user role:", error);
        return false;
    }

    return data && data.length > 0;
}

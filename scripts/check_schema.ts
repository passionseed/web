
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

async function checkSchema() {
    const { data, error } = await supabase
        .from('thailand_admission_plans')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample Row:', JSON.stringify(data[0], null, 2));
    }
}

checkSchema();

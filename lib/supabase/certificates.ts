import { createClient } from "@/utils/supabase/client";
import type { SeedCertificateConfig, IssuedCertificate, CertificateData } from "@/types/seeds";

/**
 * Get certificate configuration for a seed
 */
export async function getCertificateConfig(seedId: string) {
    // Validate seedId
    if (!seedId || seedId === "") {
        return null;
    }

    const supabase = createClient();

    const { data, error } = await supabase
        .from("seed_certificates")
        .select("*")
        .eq("seed_id", seedId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching certificate config:", error);
        return null;
    }

    return data as SeedCertificateConfig | null;
}

/**
 * Create or update certificate configuration for a seed
 */
export async function upsertCertificateConfig(
    seedId: string,
    config: Partial<Omit<SeedCertificateConfig, "id" | "seed_id" | "created_at" | "updated_at">>
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("seed_certificates")
        .upsert({
            seed_id: seedId,
            ...config,
        }, {
            onConflict: "seed_id",
        })
        .select()
        .single();

    if (error) {
        console.error("Error upserting certificate config:", error);
        throw error;
    }

    return data as SeedCertificateConfig;
}

/**
 * Check if a user is eligible for a certificate
 */
export async function checkCertificateEligibility(
    userId: string,
    seedId: string,
    roomId: string
) {
    const supabase = createClient();

    // Check if user completed the seed
    const { data: completion, error: completionError } = await supabase
        .from("seed_room_completions")
        .select("id")
        .eq("user_id", userId)
        .eq("room_id", roomId)
        .single();

    if (completionError || !completion) {
        return false;
    }

    // Check if room belongs to the seed
    const { data: room, error: roomError } = await supabase
        .from("seed_rooms")
        .select("seed_id")
        .eq("id", roomId)
        .eq("seed_id", seedId)
        .single();

    if (roomError || !room) {
        return false;
    }

    return true;
}

/**
 * Get issued certificate for a user
 */
export async function getIssuedCertificate(
    userId: string,
    seedId: string,
    roomId: string
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("issued_certificates")
        .select("*")
        .eq("user_id", userId)
        .eq("seed_id", seedId)
        .eq("room_id", roomId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Error fetching issued certificate:", error);
        return null;
    }

    return data as IssuedCertificate | null;
}

/**
 * Create a certificate record (called after generation)
 */
export async function createIssuedCertificate(
    userId: string,
    seedId: string,
    roomId: string,
    completionId: string,
    certificateData: CertificateData,
    certificateUrl?: string,
    certificateKey?: string
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("issued_certificates")
        .insert({
            user_id: userId,
            seed_id: seedId,
            room_id: roomId,
            completion_id: completionId,
            certificate_data: certificateData,
            certificate_url: certificateUrl,
            certificate_key: certificateKey,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating issued certificate:", error);
        throw error;
    }

    return data as IssuedCertificate;
}

/**
 * Update certificate download stats
 */
export async function trackCertificateDownload(certificateId: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("issued_certificates")
        .update({
            downloaded_at: new Date().toISOString(),
            download_count: supabase.rpc("increment", { row_id: certificateId }),
        })
        .eq("id", certificateId);

    if (error) {
        console.error("Error tracking certificate download:", error);
    }
}

/**
 * Increment download count for a certificate
 */
export async function incrementDownloadCount(certificateId: string) {
    const supabase = createClient();

    // Get current download count
    const { data: cert } = await supabase
        .from("issued_certificates")
        .select("download_count")
        .eq("id", certificateId)
        .single();

    if (!cert) return;

    const { error } = await supabase
        .from("issued_certificates")
        .update({
            downloaded_at: new Date().toISOString(),
            download_count: (cert.download_count || 0) + 1,
        })
        .eq("id", certificateId);

    if (error) {
        console.error("Error incrementing download count:", error);
    }
}

/**
 * Substitute variables in certificate templates
 */
export function substituteVariables(
    template: string,
    variables: {
        student_name: string;
        seed_title: string;
        completion_date: string;
        instructor_name?: string | null;
    }
): string {
    let result = template;
    result = result.replace(/\{student_name\}/g, variables.student_name);
    result = result.replace(/\{seed_title\}/g, variables.seed_title);
    result = result.replace(/\{completion_date\}/g, variables.completion_date);
    result = result.replace(/\{instructor_name\}/g, variables.instructor_name || "");
    return result;
}

/**
 * Build certificate data from config and user info
 */
export function buildCertificateData(
    config: SeedCertificateConfig,
    studentName: string,
    seedTitle: string,
    completionDate: string
): CertificateData {
    const variables = {
        student_name: studentName,
        seed_title: seedTitle,
        completion_date: completionDate,
        instructor_name: config.signature_name,
    };

    return {
        student_name: studentName,
        seed_title: seedTitle,
        completion_date: completionDate,
        instructor_name: config.signature_name,
        template_style: config.template_style,
        title: substituteVariables(config.title_template, variables),
        subtitle: substituteVariables(config.subtitle_template, variables),
        description: substituteVariables(config.description_template, variables),
        signature_enabled: config.signature_enabled,
        signature_name: config.signature_name,
        signature_title: config.signature_title,
        signature_image_url: config.signature_image_url,
        logo_url: config.logo_url,
        border_color: config.border_color,
        accent_color: config.accent_color,
    };
}

/**
 * Get all certificates issued to a user
 */
export async function getUserCertificates(userId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("issued_certificates")
        .select(`
            *,
            seeds:seed_id (
                title,
                cover_image_url
            )
        `)
        .eq("user_id", userId)
        .order("issued_at", { ascending: false });

    if (error) {
        console.error("Error fetching user certificates:", error);
        return [];
    }

    return data as IssuedCertificate[];
}

/**
 * Get all certificates issued for a seed
 */
export async function getSeedCertificates(seedId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("issued_certificates")
        .select(`
            *,
            profiles:user_id (
                full_name,
                email
            )
        `)
        .eq("seed_id", seedId)
        .order("issued_at", { ascending: false });

    if (error) {
        console.error("Error fetching seed certificates:", error);
        return [];
    }

    return data;
}

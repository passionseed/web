"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";

const CURRENT_TOS_VERSION = "2025-01-24";

export function TOSAcceptanceModal() {
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    checkTOSAcceptance();
  }, []);

  const checkTOSAcceptance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Skip for unauthenticated or anonymous users
      if (!user || user.is_anonymous) return;

      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("tos_accepted_at, tos_version")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error checking TOS acceptance:", error.message || error);
        console.error("Error details:", { code: error.code, details: error.details, hint: error.hint });
        return;
      }

      // Show modal if TOS not accepted or version is outdated
      const needsAcceptance = !profile?.tos_accepted_at || profile?.tos_version !== CURRENT_TOS_VERSION;
      
      if (needsAcceptance) {
        setOpen(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Error in checkTOSAcceptance:", error);
    }
  };

  const handleAccept = async () => {
    if (!accepted) {
      toast.error("Please read and accept the Terms of Service to continue");
      return;
    }

    if (!userId) {
      toast.error("User not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          tos_accepted_at: new Date().toISOString(),
          tos_version: CURRENT_TOS_VERSION,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Terms of Service accepted");
      setOpen(false);
    } catch (error) {
      console.error("Error accepting TOS:", error);
      toast.error("Failed to save acceptance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] !top-[4vh] sm:!top-[50%] !translate-y-0 sm:!-translate-y-1/2 flex flex-col p-4 sm:p-6 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2 pb-2 mb-3">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-lg md:text-xl leading-tight break-words">
                Important: Updated Terms of Service
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1 leading-snug">
                Please review and accept our updated Terms
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[40vh] sm:h-[400px] pr-2 sm:pr-4 -mr-2 sm:-mr-4 flex-1 overflow-x-hidden">
          <div className="space-y-4 sm:space-y-6 text-xs sm:text-sm max-w-full">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 sm:p-4 md:p-6 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Terms of Service</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">
                    Last updated: {new Date(CURRENT_TOS_VERSION).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 break-words">
                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">1. Acceptance of Terms</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement.
                  </p>
                </section>

                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">2. Use License</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    Permission is granted to temporarily access the materials (information or software) on this platform for personal, non-commercial transitory viewing only.
                  </p>
                </section>

                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">3. User Data and Privacy</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    We collect and process your personal data in accordance with our Privacy Policy. By using this platform, you consent to such processing and you warrant that all data provided by you is accurate.
                  </p>
                </section>

                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">4. User Responsibilities</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
                  </p>
                </section>

                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">5. Content Ownership</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    You retain ownership of any content you create on the platform. By posting content, you grant us a non-exclusive license to use, modify, and display such content as necessary to provide the service.
                  </p>
                </section>

                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">6. Prohibited Activities</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    You may not use the platform for any illegal purposes or to violate any laws. You may not attempt to gain unauthorized access to any portion of the platform.
                  </p>
                </section>

                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">7. Limitation of Liability</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    The platform is provided "as is" without warranties of any kind. We shall not be liable for any damages arising from the use or inability to use the platform.
                  </p>
                </section>

                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">8. Changes to Terms</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    We reserve the right to modify these terms at any time. We will notify users of any material changes, and continued use of the platform constitutes acceptance of the modified terms.
                  </p>
                </section>

                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">9. Termination</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    We may terminate or suspend your account and access to the platform immediately, without prior notice, for conduct that we believe violates these Terms of Service.
                  </p>
                </section>

                <section className="max-w-full">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 break-words">10. Contact Information</h4>
                  <p className="text-xs sm:text-sm leading-relaxed break-words">
                    If you have any questions about these Terms, please contact us through the platform's support channels.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t pt-3 sm:pt-4 space-y-3 sm:space-y-4 mt-3">
          <div className="flex items-start space-x-2 sm:space-x-3 bg-slate-50 dark:bg-slate-900 p-3 sm:p-4 rounded-lg max-w-full">
            <Checkbox
              id="tos-accept"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              className="mt-0.5 sm:mt-1 flex-shrink-0"
            />
            <Label
              htmlFor="tos-accept"
              className="text-xs sm:text-sm font-medium leading-relaxed cursor-pointer break-words flex-1"
            >
              I have read and agree to the Terms of Service and Privacy Policy. I understand that by clicking "Accept", I am entering into a legally binding agreement.
            </Label>
          </div>

          <div className="flex gap-2 sm:gap-3 justify-end">
            <Button
              onClick={handleAccept}
              disabled={!accepted || isSubmitting}
              size="lg"
              className="w-full sm:w-auto sm:min-w-[200px] text-sm sm:text-base"
            >
              {isSubmitting ? "Accepting..." : "Accept and Continue"}
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center leading-relaxed px-2">
            You must accept the Terms of Service to continue using the platform
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

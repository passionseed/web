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
      
      if (!user) return;
      
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
        className="max-w-3xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Important: Updated Terms of Service</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Please review and accept our updated Terms of Service to continue using the platform
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4 -mr-4">
          <div className="space-y-6 text-sm">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3 mb-4">
                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-base mb-2">Terms of Service</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Last updated: {new Date(CURRENT_TOS_VERSION).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <section>
                  <h4 className="font-semibold mb-2">1. Acceptance of Terms</h4>
                  <p>
                    By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">2. Use License</h4>
                  <p>
                    Permission is granted to temporarily access the materials (information or software) on this platform for personal, non-commercial transitory viewing only.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">3. User Data and Privacy</h4>
                  <p>
                    We collect and process your personal data in accordance with our Privacy Policy. By using this platform, you consent to such processing and you warrant that all data provided by you is accurate.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">4. User Responsibilities</h4>
                  <p>
                    You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">5. Content Ownership</h4>
                  <p>
                    You retain ownership of any content you create on the platform. By posting content, you grant us a non-exclusive license to use, modify, and display such content as necessary to provide the service.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">6. Prohibited Activities</h4>
                  <p>
                    You may not use the platform for any illegal purposes or to violate any laws. You may not attempt to gain unauthorized access to any portion of the platform.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">7. Limitation of Liability</h4>
                  <p>
                    The platform is provided "as is" without warranties of any kind. We shall not be liable for any damages arising from the use or inability to use the platform.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">8. Changes to Terms</h4>
                  <p>
                    We reserve the right to modify these terms at any time. We will notify users of any material changes, and continued use of the platform constitutes acceptance of the modified terms.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">9. Termination</h4>
                  <p>
                    We may terminate or suspend your account and access to the platform immediately, without prior notice, for conduct that we believe violates these Terms of Service.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2">10. Contact Information</h4>
                  <p>
                    If you have any questions about these Terms, please contact us through the platform's support channels.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t pt-4 space-y-4">
          <div className="flex items-start space-x-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
            <Checkbox 
              id="tos-accept" 
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              className="mt-1"
            />
            <Label 
              htmlFor="tos-accept" 
              className="text-sm font-medium leading-relaxed cursor-pointer"
            >
              I have read and agree to the Terms of Service and Privacy Policy. I understand that by clicking "Accept", I am entering into a legally binding agreement.
            </Label>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              onClick={handleAccept}
              disabled={!accepted || isSubmitting}
              size="lg"
              className="min-w-[200px]"
            >
              {isSubmitting ? "Accepting..." : "Accept and Continue"}
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            You must accept the Terms of Service to continue using the platform
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

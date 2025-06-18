'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/auth/login-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JoinWorkshopForm } from "./join-workshop-form";

type JoinWorkshopButtonProps = {
  workshopId: string;
  isAuthenticated: boolean;
};

export function JoinWorkshopButton({ workshopId, isAuthenticated }: JoinWorkshopButtonProps) {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const router = useRouter();

  const handleJoinClick = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
    } else {
      setShowJoinDialog(true);
    }
  };

  const handleLoginSuccess = () => {
    setShowJoinDialog(true);
    setShowLoginDialog(false);
  };

  return (
    <>
      <Button
        size="lg"
        className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8"
        onClick={handleJoinClick}
      >
        Join Workshop
      </Button>

      <LoginDialog 
        open={showLoginDialog} 
        onOpenChange={setShowLoginDialog} 
        redirectPath={`/workshops/${workshopId}?showJoin=true`}
        onSuccess={handleLoginSuccess}
      />

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Join Workshop</DialogTitle>
            <DialogDescription className="text-gray-300">
              Please fill out this form to join the workshop
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-1">
            <JoinWorkshopForm 
              workshopId={workshopId} 
              onSuccess={() => setShowJoinDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

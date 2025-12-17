"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileImage, FileText, X, Trophy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { CertificateData, SeedCertificateConfig } from "@/types/seeds";
import { CertificateTemplate } from "./CertificateTemplate";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { incrementDownloadCount } from "@/lib/supabase/certificates";
import { motion } from "framer-motion";

interface CertificatePreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    certificateData: CertificateData;
    certificateId?: string;
    config?: Partial<SeedCertificateConfig>;
}

export function CertificatePreviewModal({
    open,
    onOpenChange,
    certificateData,
    certificateId,
    config,
}: CertificatePreviewModalProps) {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    // ... download handlers (keep same)

    const handleDownloadPNG = async () => {
        if (!certificateRef.current) return;

        setDownloading(true);
        try {
            const dataUrl = await toPng(certificateRef.current, {
                quality: 1.0,
                pixelRatio: 2,
            });

            // Create download link
            const link = document.createElement("a");
            link.download = `certificate-${certificateData.seed_title.replace(/\s+/g, "-").toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();

            // Track download
            if (certificateId) {
                await incrementDownloadCount(certificateId);
            }

            toast.success("Certificate downloaded as PNG!");
        } catch (error) {
            console.error("Error downloading PNG:", error);
            toast.error("Failed to download certificate");
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!certificateRef.current) return;

        setDownloading(true);
        try {
            const dataUrl = await toPng(certificateRef.current, {
                quality: 1.0,
                pixelRatio: 2,
            });

            // Create PDF
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "px",
                format: [1200, 850],
            });

            pdf.addImage(dataUrl, "PNG", 0, 0, 1200, 850);
            pdf.save(`certificate-${certificateData.seed_title.replace(/\s+/g, "-").toLowerCase()}.pdf`);

            // Track download
            if (certificateId) {
                await incrementDownloadCount(certificateId);
            }

            toast.success("Certificate downloaded as PDF!");
        } catch (error) {
            console.error("Error downloading PDF:", error);
            toast.error("Failed to download certificate");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-5xl w-full border-2 border-yellow-500/50 bg-gradient-to-br from-neutral-900 via-neutral-900 to-yellow-900/20 max-h-[95vh] h-fit p-0 overflow-hidden flex flex-col"
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <div className="p-6 pb-2 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-1"
                        >
                            <div className="relative mb-1">
                                <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
                                <Trophy className="w-8 h-8 text-yellow-500 relative" />
                            </div>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                                Your Certificate
                            </DialogTitle>
                            <div className="flex items-center gap-2 text-yellow-500/80 text-xs font-medium">
                                <Sparkles className="w-3 h-3" />
                                <span>Ready for download</span>
                                <Sparkles className="w-3 h-3" />
                            </div>
                        </motion.div>
                    </DialogHeader>

                    <div className="space-y-4 py-2 flex flex-col items-center flex-1">
                        {/* Certificate Preview - contained and scaled to fit */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="relative w-full h-[600px] bg-neutral-900/50 rounded-xl border border-yellow-900/30 flex items-center justify-center overflow-hidden group"
                        >
                            {/* Decorative corners */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-yellow-500/30 rounded-tl-lg group-hover:border-yellow-500 transition-colors z-10" />
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-yellow-500/30 rounded-tr-lg group-hover:border-yellow-500 transition-colors z-10" />
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-yellow-500/30 rounded-bl-lg group-hover:border-yellow-500 transition-colors z-10" />
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-yellow-500/30 rounded-br-lg group-hover:border-yellow-500 transition-colors z-10" />

                            {/* Scaled certificate container */}
                            <div className="transform scale-[0.8] origin-center shadow-2xl shadow-yellow-900/20">
                                <CertificateTemplate ref={certificateRef} data={certificateData} config={config} />
                            </div>
                        </motion.div>

                        {/* Download Buttons - compact grid */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-2 gap-3 max-w-xl mx-auto w-full"
                        >
                            <Button
                                onClick={handleDownloadPNG}
                                disabled={downloading}
                                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold gap-2 py-5 text-base shadow-lg shadow-yellow-900/20 border-0"
                            >
                                {downloading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FileImage className="w-4 h-4" />
                                )}
                                Download PNG
                            </Button>
                            <Button
                                onClick={handleDownloadPDF}
                                disabled={downloading}
                                className="bg-neutral-800 hover:bg-neutral-700 text-yellow-500 border-2 border-yellow-500/50 hover:border-yellow-500 font-semibold gap-2 py-5 text-base"
                            >
                                {downloading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FileText className="w-4 h-4" />
                                )}
                                Download PDF
                            </Button>
                        </motion.div>

                        {/* Info */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-xs text-neutral-400 text-center"
                        >
                            <p>Share your achievement with the world! #PassionSeed</p>
                        </motion.div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/i18n/language-context";
import { Upload, X, Loader2 } from "lucide-react";

export interface ProfileData {
  name: string;
  title: string;
  company: string;
  fieldCategory: string;
  linkedinUrl: string;
  email: string;
  photoUrl: string;
  dataConsentAgreed: boolean;
  impactUpdatesOptIn: boolean;
}

interface ProfileFormProps {
  onSubmit: (data: ProfileData) => void;
  isLoading?: boolean;
  sessionId: string;
}

export function ProfileForm({ onSubmit, isLoading, sessionId }: ProfileFormProps) {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<ProfileData>({
    name: "",
    title: "",
    company: "",
    fieldCategory: "",
    linkedinUrl: "",
    email: "",
    photoUrl: "",
    dataConsentAgreed: false,
    impactUpdatesOptIn: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  const content = {
    en: {
      title: "About you",
      subtitle: "This will appear on the PathLab we create from your interview.",
      nameLabel: "Full name *",
      namePlaceholder: "Alex Johnson",
      titleLabel: "Job title *",
      titlePlaceholder: "Senior Software Engineer",
      companyLabel: "University + Faculty / Company *",
      companyPlaceholder: "e.g., Chula BAScii or Acme Corp",
      fieldLabel: "Your field *",
      fieldPlaceholder: "Software Engineering, Medicine, Finance...",
      linkedinLabel: "LinkedIn URL (optional)",
      linkedinPlaceholder: "https://linkedin.com/in/yourname",
      emailLabel: "Email address *",
      emailPlaceholder: "you@example.com",
      photoLabel: "Profile photo (optional)",
      photoUpload: "Tap to upload a photo",
      photoHint: "PNG, JPG up to 5MB",
      photoRemove: "Remove photo",
      consentLabel: "I agree that PassionSeed may use my interview and LinkedIn information to create career exploration content for students and the next generation.",
      impactLabel: "Keep me updated on how my story impacts students and the next generation.",
      continue: "Continue",
      saving: "Saving...",
      reqName: "Name is required",
      reqTitle: "Job title is required",
      reqCompany: "Company is required",
      reqField: "Field is required",
      reqEmail: "Email is required",
      invalidEmail: "Please enter a valid email address",
      reqConsent: "You must agree to continue",
      photoError: "Photo upload failed. Please try again.",
      photoSizeError: "Photo must be under 5MB",
      photoTypeError: "Only image files are allowed",
    },
    th: {
      title: "เกี่ยวกับคุณ",
      subtitle: "ข้อมูลนี้จะปรากฏบน PathLab ที่เราสร้างจากการสัมภาษณ์ของคุณ",
      nameLabel: "ชื่อ-นามสกุล *",
      namePlaceholder: "เช่น สมชาย ใจดี",
      titleLabel: "ตำแหน่งงาน *",
      titlePlaceholder: "เช่น วิศวกรซอฟต์แวร์อาวุโส",
      companyLabel: "มหาวิทยาลัย + คณะ / บริษัท *",
      companyPlaceholder: "เช่น Chula คณะ BAScii หรือ Acme Corp",
      fieldLabel: "สายงานของคุณ *",
      fieldPlaceholder: "เช่น วิศวกรรมซอฟต์แวร์, การแพทย์, การเงิน...",
      linkedinLabel: "ลิงก์ LinkedIn (ไม่บังคับ)",
      linkedinPlaceholder: "https://linkedin.com/in/yourname",
      emailLabel: "อีเมล *",
      emailPlaceholder: "you@example.com",
      photoLabel: "รูปโปรไฟล์ (ไม่บังคับ)",
      photoUpload: "แตะเพื่ออัปโหลดรูปภาพ",
      photoHint: "PNG, JPG ขนาดสูงสุด 5MB",
      photoRemove: "ลบรูปภาพ",
      consentLabel: "ฉันยินยอมให้ PassionSeed ใช้การสัมภาษณ์และข้อมูล LinkedIn ของฉันเพื่อสร้างเนื้อหาการสำรวจอาชีพสำหรับนักเรียนและคนรุ่นต่อไป",
      impactLabel: "อยากรับข่าวสารเกี่ยวกับผลกระทบที่เรื่องของฉันมีต่อนักเรียนและคนรุ่นต่อไป",
      continue: "ดำเนินการต่อ",
      saving: "กำลังบันทึก...",
      reqName: "กรุณาระบุชื่อ",
      reqTitle: "กรุณาระบุตำแหน่งงาน",
      reqCompany: "กรุณาระบุบริษัท",
      reqField: "กรุณาระบุสายงาน",
      reqEmail: "กรุณาระบุอีเมล",
      invalidEmail: "กรุณาระบุอีเมลที่ถูกต้อง",
      reqConsent: "กรุณายินยอมเพื่อดำเนินการต่อ",
      photoError: "อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      photoSizeError: "รูปภาพต้องมีขนาดไม่เกิน 5MB",
      photoTypeError: "อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น",
    }
  };

  const t = content[language];

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProfileData, string>> = {};
    if (!data.name.trim()) newErrors.name = t.reqName;
    if (!data.title.trim()) newErrors.title = t.reqTitle;
    if (!data.company.trim()) newErrors.company = t.reqCompany;
    if (!data.fieldCategory.trim()) newErrors.fieldCategory = t.reqField;
    if (!data.email.trim()) newErrors.email = t.reqEmail;
    else if (!EMAIL_REGEX.test(data.email.trim())) newErrors.email = t.invalidEmail;
    if (!data.dataConsentAgreed) newErrors.dataConsentAgreed = t.reqConsent;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(data);
  };

  const set = (field: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handlePhotoSelect = async (file: File) => {
    setPhotoUploadError(null);

    if (!file.type.startsWith("image/")) {
      setPhotoUploadError(t.photoTypeError);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoUploadError(t.photoSizeError);
      return;
    }

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    // Upload to server
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sessionId);

      const res = await fetch("/api/expert-interview/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { photoUrl } = await res.json();
      setData((prev) => ({ ...prev, photoUrl }));
    } catch {
      setPhotoUploadError(t.photoError);
      setPhotoPreview(null);
      setData((prev) => ({ ...prev, photoUrl: "" }));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePhotoSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoSelect(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setData((prev) => ({ ...prev, photoUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">{t.title}</h2>
        <p className="text-sm text-gray-400">
          {t.subtitle}
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="name" className="text-gray-300">{t.nameLabel}</Label>
        <Input
          id="name"
          value={data.name}
          onChange={set("name")}
          placeholder={t.namePlaceholder}
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="title" className="text-gray-300">{t.titleLabel}</Label>
        <Input
          id="title"
          value={data.title}
          onChange={set("title")}
          placeholder={t.titlePlaceholder}
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
        />
        {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="company" className="text-gray-300">{t.companyLabel}</Label>
        <Input
          id="company"
          value={data.company}
          onChange={set("company")}
          placeholder={t.companyPlaceholder}
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
        />
        {errors.company && <p className="text-xs text-red-400">{errors.company}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="fieldCategory" className="text-gray-300">{t.fieldLabel}</Label>
        <Input
          id="fieldCategory"
          value={data.fieldCategory}
          onChange={set("fieldCategory")}
          placeholder={t.fieldPlaceholder}
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
        />
        {errors.fieldCategory && <p className="text-xs text-red-400">{errors.fieldCategory}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="linkedinUrl" className="text-gray-300">{t.linkedinLabel}</Label>
        <Input
          id="linkedinUrl"
          value={data.linkedinUrl}
          onChange={set("linkedinUrl")}
          placeholder={t.linkedinPlaceholder}
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
        />
      </div>

      {/* Email */}
      <div className="space-y-1">
        <Label htmlFor="email" className="text-gray-300">{t.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={set("email")}
          placeholder={t.emailPlaceholder}
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
      </div>

      {/* Profile photo */}
      <div className="space-y-2">
        <Label className="text-gray-300">{t.photoLabel}</Label>
        {photoPreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Profile preview"
              className="h-24 w-24 rounded-full object-cover border-2 border-gray-700"
            />
            {isUploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
            {!isUploadingPhoto && (
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gray-700 flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label={t.photoRemove}
              >
                <X className="h-3 w-3 text-white" />
              </button>
            )}
          </div>
        ) : (
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-gray-500 transition-colors"
          >
            <Upload className="h-6 w-6 text-gray-500" />
            <p className="text-sm text-gray-400">{t.photoUpload}</p>
            <p className="text-xs text-gray-600">{t.photoHint}</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        {photoUploadError && <p className="text-xs text-red-400">{photoUploadError}</p>}
      </div>

      {/* Data consent */}
      <div className="space-y-2">
        <div className="flex items-start gap-3 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
          <Checkbox
            id="dataConsent"
            checked={data.dataConsentAgreed}
            onCheckedChange={(checked) => {
              setData((prev) => ({ ...prev, dataConsentAgreed: !!checked }));
              if (errors.dataConsentAgreed) setErrors((prev) => ({ ...prev, dataConsentAgreed: undefined }));
            }}
            className="mt-0.5 border-gray-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
          />
          <Label htmlFor="dataConsent" className="text-sm text-gray-300 cursor-pointer leading-relaxed">
            {t.consentLabel}
          </Label>
        </div>
        {errors.dataConsentAgreed && <p className="text-xs text-red-400">{errors.dataConsentAgreed}</p>}
      </div>

      {/* Impact updates opt-in */}
      <div className="flex items-start gap-3 p-4 bg-purple-900/20 border border-purple-700/40 rounded-xl">
        <Checkbox
          id="impactUpdates"
          checked={data.impactUpdatesOptIn}
          onCheckedChange={(checked) => {
            setData((prev) => ({ ...prev, impactUpdatesOptIn: !!checked }));
          }}
          className="mt-0.5 border-purple-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
        />
        <Label htmlFor="impactUpdates" className="text-sm text-purple-200 cursor-pointer leading-relaxed">
          {t.impactLabel}
        </Label>
      </div>

      <Button
        type="submit"
        disabled={isLoading || isUploadingPhoto}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white"
      >
        {isLoading ? t.saving : t.continue}
      </Button>
    </form>
  );
}

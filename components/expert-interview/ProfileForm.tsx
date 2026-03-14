"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/language-context";

export interface ProfileData {
  name: string;
  title: string;
  company: string;
  fieldCategory: string;
  linkedinUrl: string;
}

interface ProfileFormProps {
  onSubmit: (data: ProfileData) => void;
  isLoading?: boolean;
}

export function ProfileForm({ onSubmit, isLoading }: ProfileFormProps) {
  const { language } = useLanguage();
  const [data, setData] = useState<ProfileData>({
    name: "",
    title: "",
    company: "",
    fieldCategory: "",
    linkedinUrl: "",
  });
  const [errors, setErrors] = useState<Partial<ProfileData>>({});

  const content = {
    en: {
      title: "About you",
      subtitle: "This will appear on the PathLab we create from your interview.",
      nameLabel: "Full name *",
      namePlaceholder: "Alex Johnson",
      titleLabel: "Job title *",
      titlePlaceholder: "Senior Software Engineer",
      companyLabel: "Company / Organization *",
      companyPlaceholder: "Acme Corp",
      fieldLabel: "Your field *",
      fieldPlaceholder: "Software Engineering, Medicine, Finance...",
      linkedinLabel: "LinkedIn URL (optional)",
      linkedinPlaceholder: "https://linkedin.com/in/yourname",
      continue: "Continue",
      saving: "Saving...",
      reqName: "Name is required",
      reqTitle: "Job title is required",
      reqCompany: "Company is required",
      reqField: "Field is required",
    },
    th: {
      title: "เกี่ยวกับคุณ",
      subtitle: "ข้อมูลนี้จะปรากฏบน PathLab ที่เราสร้างจากการสัมภาษณ์ของคุณ",
      nameLabel: "ชื่อ-นามสกุล *",
      namePlaceholder: "เช่น สมชาย ใจดี",
      titleLabel: "ตำแหน่งงาน *",
      titlePlaceholder: "เช่น วิศวกรซอฟต์แวร์อาวุโส",
      companyLabel: "บริษัท / องค์กร *",
      companyPlaceholder: "เช่น Acme Corp",
      fieldLabel: "สายงานของคุณ *",
      fieldPlaceholder: "เช่น วิศวกรรมซอฟต์แวร์, การแพทย์, การเงิน...",
      linkedinLabel: "ลิงก์ LinkedIn (ไม่บังคับ)",
      linkedinPlaceholder: "https://linkedin.com/in/yourname",
      continue: "ดำเนินการต่อ",
      saving: "กำลังบันทึก...",
      reqName: "กรุณาระบุชื่อ",
      reqTitle: "กรุณาระบุตำแหน่งงาน",
      reqCompany: "กรุณาระบุบริษัท",
      reqField: "กรุณาระบุสายงาน",
    }
  };

  const t = content[language];

  const validate = (): boolean => {
    const newErrors: Partial<ProfileData> = {};
    if (!data.name.trim()) newErrors.name = t.reqName;
    if (!data.title.trim()) newErrors.title = t.reqTitle;
    if (!data.company.trim()) newErrors.company = t.reqCompany;
    if (!data.fieldCategory.trim()) newErrors.fieldCategory = t.reqField;
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

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white"
      >
        {isLoading ? t.saving : t.continue}
      </Button>
    </form>
  );
}

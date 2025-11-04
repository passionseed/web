/**
 * Shared types for North Star Wizard components
 */

export type Language = "en" | "th";

export interface SMARTMilestone {
  title: string;
  startDate: string;
  dueDate: string;
  measurable: string;
}

export interface NorthStarFormData {
  visionQuestion: string;
  milestones: SMARTMilestone[];
  lifeAspects: string[];
  sdgGoals: number[];
  careerPath: string;
  starConfig: {
    coreSize: number;
    flareCount: number;
    seed: string;
  };
  northStarColor: string;
  title: string;
}

export interface WizardStepProps {
  language: Language;
  formData: NorthStarFormData;
  onFormDataChange: (data: Partial<NorthStarFormData>) => void;
}

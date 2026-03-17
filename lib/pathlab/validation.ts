/**
 * Input Validation for PathLab Page Builder
 *
 * Validates all user inputs before they reach the database.
 * Returns structured validation errors for display in UI.
 */

import type {
  CreatePathActivityInput,
  UpdatePathActivityInput,
  PathActivityType,
  PathContentType,
  PathAssessmentType,
} from '@/types/pathlab';

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public userMessage: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Constants
export const MAX_ACTIVITIES_PER_PAGE = 20;
const MAX_TITLE_LENGTH = 200;
const MAX_INSTRUCTIONS_LENGTH = 5000;
const MAX_CONTENT_BODY_LENGTH = 50000; // 50KB
const MAX_BATCH_SIZE = MAX_ACTIVITIES_PER_PAGE;

/**
 * Validate activity creation input
 */
export function validateActivityInput(
  input: CreatePathActivityInput | UpdatePathActivityInput
): void {
  // Title validation
  if ('title' in input && input.title !== undefined) {
    if (!input.title || input.title.trim() === '') {
      throw new ValidationError(
        'Activity title is required',
        'title',
        'Please enter an activity title'
      );
    }

    if (input.title.length > MAX_TITLE_LENGTH) {
      throw new ValidationError(
        `Title exceeds ${MAX_TITLE_LENGTH} characters`,
        'title',
        `Title must be ${MAX_TITLE_LENGTH} characters or less`
      );
    }
  }

  // Instructions validation
  if (input.instructions !== undefined && input.instructions !== null) {
    if (input.instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      throw new ValidationError(
        `Instructions exceed ${MAX_INSTRUCTIONS_LENGTH} characters`,
        'instructions',
        `Instructions must be ${MAX_INSTRUCTIONS_LENGTH} characters or less`
      );
    }
  }

  // Activity type validation
  if ('activity_type' in input && input.activity_type !== undefined) {
    const validTypes: PathActivityType[] = [
      'learning',
      'reflection',
      'milestone',
      'checkpoint',
      'journal_prompt',
    ];

    if (!validTypes.includes(input.activity_type)) {
      throw new ValidationError(
        `Invalid activity type: ${input.activity_type}`,
        'activity_type',
        'Please select a valid activity type'
      );
    }
  }

  // Estimated minutes validation
  if (input.estimated_minutes !== undefined && input.estimated_minutes !== null) {
    if (input.estimated_minutes < 0) {
      throw new ValidationError(
        'Estimated minutes cannot be negative',
        'estimated_minutes',
        'Time estimate must be a positive number'
      );
    }

    if (input.estimated_minutes > 1440) {
      // Max 24 hours
      throw new ValidationError(
        'Estimated minutes exceeds 24 hours',
        'estimated_minutes',
        'Time estimate cannot exceed 24 hours (1440 minutes)'
      );
    }
  }
}

/**
 * Validate content input
 */
export function validateContentInput(input: {
  content_type: PathContentType;
  content_url?: string | null;
  content_body?: string | null;
  content_title?: string | null;
}): void {
  // Validate content type
  const validContentTypes: PathContentType[] = [
    'video',
    'short_video',
    'canva_slide',
    'text',
    'image',
    'pdf',
    'resource_link',
    'order_code',
    'daily_prompt',
    'reflection_card',
    'emotion_check',
    'progress_snapshot',
  ];

  if (!validContentTypes.includes(input.content_type)) {
    throw new ValidationError(
      `Invalid content type: ${input.content_type}`,
      'content_type',
      'Please select a valid content type'
    );
  }

  // Validate URL for URL-based content types
  const urlContentTypes: PathContentType[] = [
    'video',
    'short_video',
    'canva_slide',
    'image',
    'pdf',
    'resource_link',
  ];

  if (urlContentTypes.includes(input.content_type)) {
    if (!input.content_url || input.content_url.trim() === '') {
      throw new ValidationError(
        'Content URL is required for this content type',
        'content_url',
        'Please provide a URL'
      );
    }
  }

  // Validate body for body-based content types
  const bodyContentTypes: PathContentType[] = ['text', 'daily_prompt', 'reflection_card'];

  if (bodyContentTypes.includes(input.content_type)) {
    if (!input.content_body || input.content_body.trim() === '') {
      throw new ValidationError(
        'Content body is required for this content type',
        'content_body',
        'Please provide content text'
      );
    }

    if (input.content_body.length > MAX_CONTENT_BODY_LENGTH) {
      throw new ValidationError(
        `Content body exceeds ${MAX_CONTENT_BODY_LENGTH} characters`,
        'content_body',
        `Content must be ${MAX_CONTENT_BODY_LENGTH} characters or less`
      );
    }
  }
}

/**
 * Validate assessment input
 */
export function validateAssessmentInput(input: {
  assessment_type: PathAssessmentType;
  points_possible?: number | null;
}): void {
  // Validate assessment type
  const validAssessmentTypes: PathAssessmentType[] = [
    'quiz',
    'text_answer',
    'file_upload',
    'image_upload',
    'checklist',
    'daily_reflection',
    'interest_rating',
    'energy_check',
  ];

  if (!validAssessmentTypes.includes(input.assessment_type)) {
    throw new ValidationError(
      `Invalid assessment type: ${input.assessment_type}`,
      'assessment_type',
      'Please select a valid assessment type'
    );
  }

  // Validate points
  if (input.points_possible !== undefined && input.points_possible !== null) {
    if (input.points_possible < 0) {
      throw new ValidationError(
        'Points possible cannot be negative',
        'points_possible',
        'Points must be a positive number'
      );
    }

    if (input.points_possible > 10000) {
      throw new ValidationError(
        'Points possible exceeds maximum',
        'points_possible',
        'Points cannot exceed 10,000'
      );
    }
  }
}

/**
 * Validate batch activity creation
 */
export function validateBatchActivities(
  activities: CreatePathActivityInput[]
): void {
  if (activities.length === 0) {
    throw new ValidationError(
      'No activities provided',
      'activities',
      'Please provide at least one activity'
    );
  }

  if (activities.length > MAX_BATCH_SIZE) {
    throw new ValidationError(
      `Batch size exceeds ${MAX_BATCH_SIZE}`,
      'activities',
      `You can create a maximum of ${MAX_BATCH_SIZE} activities at once`
    );
  }

  // Validate each activity
  activities.forEach((activity, index) => {
    try {
      validateActivityInput(activity);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Activity ${index + 1}: ${error.message}`,
          `activities[${index}].${error.field}`,
          `Activity ${index + 1}: ${error.userMessage}`
        );
      }
      throw error;
    }
  });

  // Check for duplicate display_order
  const orders = activities.map(a => a.display_order);
  const duplicates = orders.filter((order, index) => orders.indexOf(order) !== index);
  if (duplicates.length > 0) {
    throw new ValidationError(
      'Duplicate display_order values',
      'activities',
      'Each activity must have a unique display order'
    );
  }
}

/**
 * Validate page activity count (enforce 20-activity limit)
 */
export async function validatePageActivityCount(
  pageId: string,
  additionalActivities: number,
  getCurrentCount: () => Promise<number>
): Promise<void> {
  const currentCount = await getCurrentCount();
  const newTotal = currentCount + additionalActivities;

  if (newTotal > MAX_ACTIVITIES_PER_PAGE) {
    throw new ValidationError(
      `Page would exceed ${MAX_ACTIVITIES_PER_PAGE} activity limit`,
      'activities',
      `This page already has ${currentCount} activities. Adding ${additionalActivities} more would exceed the limit of ${MAX_ACTIVITIES_PER_PAGE} activities per page.`
    );
  }
}

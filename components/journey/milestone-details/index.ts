/**
 * Milestone Details Components - Barrel export
 * Deep, modular architecture with inline editing and auto-save
 */

// Main orchestrators
export { MilestoneCreationMode } from "./MilestoneCreationMode";
export { MilestoneViewMode } from "./MilestoneViewMode";

// Header components
export { MilestoneHeader } from "./header/MilestoneHeader";

// Tab components
export { MilestoneTabsContainer } from "./tabs/MilestoneTabsContainer";
export { DetailsTab } from "./tabs/DetailsTab";
export { JournalTab } from "./tabs/JournalTab";

// Detail components
export { InlineEditableTitle } from "./details/InlineEditableTitle";
export { InlineEditableDescription } from "./details/InlineEditableDescription";
export { InlineEditableDetails } from "./details/InlineEditableDetails";
export { QuickProgressControls } from "./details/QuickProgressControls";
export { DependenciesSection } from "./details/DependenciesSection";
export { MilestoneMetadata } from "./details/MilestoneMetadata";
export { ChecklistRenderer } from "./details/ChecklistRenderer";

// Journal components
export { JournalEntryForm } from "./journal/JournalEntryForm";
export { JournalEntriesList } from "./journal/JournalEntriesList";
export { JournalEntryCard } from "./journal/JournalEntryCard";

// Common components
export { AutoSaveIndicator } from "./common/AutoSaveIndicator";
export { CharacterCounter } from "./common/CharacterCounter";

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Code2, Edit3, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { DirectionFinderResult } from "@/types/direction-finder";

interface DevViewPanelProps {
  result: DirectionFinderResult;
  onRegenerateSection?: (section: string, prompt: string, model: string) => Promise<void>;
}

export function DevViewPanel({ result, onRegenerateSection }: DevViewPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const debugData = result.debugMetadata;

  if (!debugData) {
    return (
      <div className="p-6 bg-amber-950/20 border border-amber-500/30 rounded-xl">
        <p className="text-amber-400 text-sm">
          ⚠️ No debug metadata available. Make sure the profile was generated with debug mode enabled.
        </p>
      </div>
    );
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  // Extract metadata from different parts
  const coreMetadata = debugData;
  const programsMetadata = (result as any).programsMetadata;
  const commitmentsMetadata = (result as any).commitmentsMetadata;

  // Debug logging
  console.log('[DevViewPanel] Metadata check:', {
    hasCore: !!coreMetadata,
    hasPrograms: !!programsMetadata,
    hasCommitments: !!commitmentsMetadata,
    corePrompt: coreMetadata?.prompt?.substring(0, 50),
    programsPrompt: programsMetadata?.prompt?.substring(0, 50),
    commitmentsPrompt: commitmentsMetadata?.prompt?.substring(0, 50),
  });

  const sections = [
    {
      id: "core",
      title: "Core Generation (Profile + Vectors)",
      model: coreMetadata?.modelId || 'unknown',
      prompt: coreMetadata?.prompt || 'No prompt available',
      engine: coreMetadata?.engine || 'generateDirectionProfileCore',
      data: {
        profile: result.profile,
        vectors: result.vectors,
      },
      generationTime: coreMetadata?.generationTime,
    },
    {
      id: "programs",
      title: "Programs Generation",
      model: programsMetadata?.modelId || coreMetadata?.modelId || 'unknown',
      prompt: programsMetadata?.prompt || 'No prompt available',
      engine: programsMetadata?.engine || 'generatePrograms',
      data: result.programs,
      generationTime: programsMetadata?.generationTime,
    },
    {
      id: "commitments",
      title: "Commitments Generation",
      model: commitmentsMetadata?.modelId || coreMetadata?.modelId || 'unknown',
      prompt: commitmentsMetadata?.prompt || 'No prompt available',
      engine: commitmentsMetadata?.engine || 'generateCommitments',
      data: result.commitments,
      generationTime: commitmentsMetadata?.generationTime,
    },
  ];

  return (
    <div className="space-y-4 bg-slate-900/50 border border-amber-500/20 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code2 className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-bold text-amber-300">Dev View</h3>
          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
            Debug Mode
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="text-amber-400 hover:text-amber-300"
        >
          {isOpen ? "Hide Details" : "Show Details"}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Model</div>
          <div className="text-sm font-mono text-amber-300">{debugData.modelId || 'default'}</div>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Engine</div>
          <div className="text-sm font-mono text-blue-300">{debugData.engine || 'N/A'}</div>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Vectors</div>
          <div className="text-sm font-bold text-green-300">{result.vectors?.length || 0}</div>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Programs</div>
          <div className="text-sm font-bold text-purple-300">{result.programs?.length || 0}</div>
        </div>
      </div>

      {/* Detailed View */}
      {isOpen && (
        <Accordion type="single" collapsible className="space-y-3">
          {sections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border border-slate-700 rounded-lg bg-slate-800/30"
            >
              <AccordionTrigger className="px-4 py-3 hover:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3 flex-wrap">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">{section.title}</span>
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
                    {section.model || 'default'}
                  </Badge>
                  {section.generationTime && (
                    <Badge variant="outline" className="text-xs border-green-500/30 text-green-300">
                      {section.generationTime}ms
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {/* Prompt Display */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-white">
                        Actual Prompt Sent to AI
                      </label>
                      <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-300">
                        {section.prompt?.length || 0} chars
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(section.prompt || "", section.id)
                        }
                        className="h-7 text-xs text-slate-400 hover:text-white"
                      >
                        {copied === section.id ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditingSection(
                            editingSection === section.id ? null : section.id
                          )
                        }
                        className="h-7 text-xs text-amber-400 hover:text-amber-300"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        {editingSection === section.id ? "Cancel" : "Edit"}
                      </Button>
                    </div>
                  </div>

                  {editingSection === section.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={
                          editedPrompts[section.id] || section.prompt || ""
                        }
                        onChange={(e) =>
                          setEditedPrompts({
                            ...editedPrompts,
                            [section.id]: e.target.value,
                          })
                        }
                        className="font-mono text-xs bg-slate-950 border-slate-700 text-slate-300 min-h-[300px]"
                        placeholder="Edit prompt..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (onRegenerateSection) {
                              onRegenerateSection(
                                section.id,
                                editedPrompts[section.id] ||
                                  section.prompt ||
                                  "",
                                section.model || "gemini-3-flash-preview"
                              );
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Regenerate with New Prompt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditedPrompts({
                              ...editedPrompts,
                              [section.id]: section.prompt || "",
                            });
                          }}
                          className="border-slate-700"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {section.prompt && section.prompt !== 'No prompt available' ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded text-xs text-blue-200 space-y-1">
                            <div className="font-semibold text-blue-100">📝 Complete AI Prompt Breakdown:</div>
                            <div className="text-[10px] text-blue-300/80 space-y-0.5 ml-4">
                              <div>✓ System instructions & rules</div>
                              <div>✓ Language requirements (Thai/English)</div>
                              <div>✓ Student's actual assessment answers (Q1-Q6)</div>
                              <div>✓ Zone of Genius, Flow state, Values, etc.</div>
                              <div>✓ Conversation history</div>
                              <div>✓ Output requirements (vectors, skills, exploration steps)</div>
                            </div>
                            <div className="text-[10px] text-blue-400 pt-1">
                              👉 This exact text was sent to <span className="font-mono font-semibold">{section.model}</span>
                            </div>
                          </div>
                          <pre className="text-xs bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-slate-300 max-h-[400px] overflow-y-auto font-mono leading-relaxed whitespace-pre-wrap">
                            {section.prompt}
                          </pre>
                        </div>
                      ) : (
                        <div className="p-4 bg-orange-950/20 border border-orange-500/30 rounded-lg text-orange-400 text-xs">
                          ⚠️ No prompt captured for this section. This might be from an older result before debug metadata was added.
                          <br />
                          <span className="text-orange-300/70 text-[10px]">
                            Try generating a new profile to see prompts for all sections.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Generated Data Preview */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">
                    Generated Data
                  </label>

                  {/* Show Profile Data */}
                  {section.id === 'core' && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-500 font-semibold">Profile:</div>
                      <pre className="text-xs bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-slate-400 max-h-[200px] overflow-y-auto">
                        {JSON.stringify(result.profile, null, 2)}
                      </pre>

                      <div className="text-xs text-slate-500 font-semibold mt-4">
                        Vectors ({result.vectors?.length || 0}):
                      </div>
                      {result.vectors?.map((vector, idx) => (
                        <details key={idx} className="group">
                          <summary className="cursor-pointer text-xs text-amber-400 hover:text-amber-300 p-2 bg-slate-800/50 rounded border border-slate-700">
                            Vector {idx + 1}: {vector.industry || vector.name}
                          </summary>
                          <pre className="text-xs bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-slate-400 max-h-[300px] overflow-y-auto mt-2">
                            {JSON.stringify(vector, null, 2)}
                          </pre>
                        </details>
                      ))}
                    </div>
                  )}

                  {/* Show other section data */}
                  {section.id !== 'core' && (
                    <pre className="text-xs bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-slate-400 max-h-[200px] overflow-y-auto">
                      {JSON.stringify(section.data, null, 2)}
                    </pre>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

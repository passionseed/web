import { AssessmentStep, AssessmentAnswers } from '@/types/direction-finder';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, Star, Home, Sun, Calendar, Sparkles, User, Users, Wrench, Lightbulb, Clock, Mountain, Heart, Zap } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CoreAssessmentProps {
  step: AssessmentStep;
  answers: Partial<AssessmentAnswers>;
  onAnswer: (answers: Partial<AssessmentAnswers>) => void;
  onNext: () => void;
  onBack: () => void;
}

const QuestionWrapper = ({ title, subtitle, children, canProceed = true, onBack, onNext }: any) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-slate-400">{subtitle}</p>}
    </div>
    <div className="py-2">
      {children}
    </div>
    <div className="flex justify-between pt-4">
      <Button variant="outline" onClick={onBack}>Back</Button>
      <Button onClick={onNext} disabled={!canProceed} className="bg-blue-600 hover:bg-blue-700">
        Next <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  </div>
);

export function CoreAssessment({ step, answers, onAnswer, onNext, onBack }: CoreAssessmentProps) {
  const [localAnswers, setLocalAnswers] = useState<Partial<AssessmentAnswers>>(answers);
  const [customSkill, setCustomSkill] = useState("");

  const addCustomSkill = () => {
    const selectedSkills = localAnswers.q6_strongest_skills || [];
    if (customSkill.trim() && !selectedSkills.includes(customSkill) && selectedSkills.length < 5) {
      updateAnswer('q6_strongest_skills', [...selectedSkills, customSkill.trim()]);
      setCustomSkill("");
    }
  };

  // Sync props to local state when step changes
  useEffect(() => {
    setLocalAnswers(answers);
  }, [step, answers]);

  const updateAnswer = (key: keyof AssessmentAnswers, value: any) => {
    const newAnswers = { ...localAnswers, [key]: value };
    setLocalAnswers(newAnswers);
    onAnswer(newAnswers);
  };

  // Intro Step
  if (step === 'intro') {
    return (
      <div className="text-center space-y-6 py-8 animate-in zoom-in duration-300">
        <div className="text-4xl">🧭</div>
        <h2 className="text-2xl font-bold text-white">Student Direction Finder</h2>
        <p className="text-slate-300 max-w-md mx-auto">
          Quick assessment of what you love and what you're good at.
          <br/>
          <span className="text-sm text-slate-400 mt-2 block">Time: 5-7 minutes</span>
        </p>
        <Button onClick={onNext} size="lg" className="bg-blue-600 hover:bg-blue-700">
          Start Assessment <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Q1: Time Flies When... (Select Top 3)
  if (step === 'q1') {
    const options = [
      "Creating/building something (art, code, crafts, music)",
      "Helping or teaching someone",
      "Competing (sports, games, debates)",
      "Deep learning (research, reading, exploring)",
      "Organizing/planning",
      "Performing for others",
      "Solving puzzles/problems"
    ];
    
    const currentSelection = localAnswers.q1_time_flies || [];
    
    const toggleSelection = (option: string) => {
      if (currentSelection.includes(option)) {
        updateAnswer('q1_time_flies', currentSelection.filter(i => i !== option));
      } else if (currentSelection.length < 3) {
        updateAnswer('q1_time_flies', [...currentSelection, option]);
      }
    };

    return (
      <QuestionWrapper 
        title="Time Flies When..." 
        subtitle={`Select your top 3 activities (${currentSelection.length}/3 selected)`}
        canProceed={currentSelection.length === 3}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="grid gap-3">
          {options.map((option) => (
            <div 
              key={option}
              onClick={() => toggleSelection(option)}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                currentSelection.includes(option) 
                  ? "bg-blue-600/20 border-blue-500 text-white" 
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
              )}
            >
              <span>{option}</span>
              {currentSelection.includes(option) && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  #{currentSelection.indexOf(option) + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  // Q2: Energy Check (Pick 3)
  if (step === 'q2') {
    const options = [
      "🛠️ Making things with my hands",
      "💡 Working with ideas and concepts",
      "👥 Collaborating with people",
      "📊 Organizing systems and data",
      "🎨 Creative expression",
      "🏃 Physical activity",
      "🎯 Leading or teaching"
    ];
    const currentSelection = localAnswers.q2_energy_sources || [];

    return (
      <QuestionWrapper 
        title="Energy Check" 
        subtitle={`Which give you ENERGY? Pick 3 (${currentSelection.length}/3)`}
        canProceed={currentSelection.length === 3}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((option) => (
            <div 
              key={option}
              onClick={() => {
                if (currentSelection.includes(option)) {
                  updateAnswer('q2_energy_sources', currentSelection.filter(i => i !== option));
                } else if (currentSelection.length < 3) {
                  updateAnswer('q2_energy_sources', [...currentSelection, option]);
                }
              }}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all",
                currentSelection.includes(option) 
                  ? "bg-green-600/20 border-green-500 text-white" 
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
              )}
            >
              {option}
            </div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  // Q3: Work Style (Clickers)
  if (step === 'q3') {
    const styles = localAnswers.q3_work_style || {
      indoor_outdoor: 50,
      structured_flexible: 50,
      solo_team: 50,
      hands_on_theory: 50,
      routine_challenge: 50
    };

    const renderClicker = (
      key: keyof typeof styles, 
      left: { label: string, icon: any }, 
      right: { label: string, icon: any }
    ) => {
      const value = styles[key];
      
      return (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-400 px-1">
            <div className="flex items-center gap-1">
              <left.icon className="w-3 h-3" /> {left.label}
            </div>
            <div className="flex items-center gap-1">
              {right.label} <right.icon className="w-3 h-3" />
            </div>
          </div>
          <div className="flex gap-1 h-10">
            {[0, 25, 50, 75, 100].map((val) => {
              const isSelected = val === value;
              // Determine color based on side
              let bgClass = "bg-slate-800 border-slate-700";
              if (isSelected) {
                if (val < 50) bgClass = "bg-blue-600 border-blue-500 text-white";
                else if (val > 50) bgClass = "bg-purple-600 border-purple-500 text-white";
                else bgClass = "bg-slate-600 border-slate-500 text-white";
              }

              return (
                <button
                  key={val}
                  onClick={() => updateAnswer('q3_work_style', { ...styles, [key]: val })}
                  className={cn(
                    "flex-1 rounded border transition-all hover:bg-slate-700",
                    bgClass
                  )}
                />
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <QuestionWrapper 
        title="Work Style" 
        subtitle="Click to show your preference"
        onBack={onBack}
        onNext={onNext}
      >
        <div className="space-y-6 bg-slate-900/30 p-4 rounded-lg border border-slate-800">
          {renderClicker(
            'indoor_outdoor', 
            { label: 'Indoor', icon: Home }, 
            { label: 'Outdoor', icon: Sun }
          )}
          {renderClicker(
            'structured_flexible', 
            { label: 'Structured', icon: Calendar }, 
            { label: 'Flexible', icon: Sparkles }
          )}
          {renderClicker(
            'solo_team', 
            { label: 'Solo', icon: User }, 
            { label: 'Team', icon: Users }
          )}
          {renderClicker(
            'hands_on_theory', 
            { label: 'Hands-on', icon: Wrench }, 
            { label: 'Theory', icon: Lightbulb }
          )}
          {renderClicker(
            'routine_challenge', 
            { label: 'Routine', icon: Clock }, 
            { label: 'Challenge', icon: Mountain }
          )}
        </div>
      </QuestionWrapper>
    );
  }

  // Q4: Subject Love (Matrix: Love vs Capable)
  if (step === 'q4') {
    const categories = {
      "STEM": ["Math/Logic", "Science (Bio/Chem/Phys)", "Technology/Coding", "Engineering/Building"],
      "Creative": ["Visual Arts/Design", "Performing Arts", "Writing/Communication"],
      "Social": ["Psychology/Human Behavior", "Business/Entrepreneurship", "Healthcare/Medicine", "Education/Teaching", "Social Issues/Politics"],
      "Other": ["Sports/Athletics", "Food/Culinary", "Fashion/Style", "Gaming/Esports"]
    };

    const selections = localAnswers.q4_subject_interests || [];

    const toggleSubject = (subject: string) => {
      const exists = selections.find(s => s.subject === subject);
      if (exists) {
        updateAnswer('q4_subject_interests', selections.filter(s => s.subject !== subject));
      } else {
        // Default to 3/3
        updateAnswer('q4_subject_interests', [...selections, { subject, love: 3, capable: 3 }]);
      }
    };

    const updateRating = (subject: string, type: 'love' | 'capable', value: number, e: React.MouseEvent) => {
      e.stopPropagation();
      updateAnswer('q4_subject_interests', selections.map(s => 
        s.subject === subject ? { ...s, [type]: value } : s
      ));
    };

    // Flatten and sort subjects
    const allSubjects = Object.entries(categories).flatMap(([cat, subs]) => 
      subs.map(sub => ({ category: cat, subject: sub }))
    );

    const sortedSubjects = [...allSubjects].sort((a, b) => {
      const aSelected = selections.find(s => s.subject === a.subject);
      const bSelected = selections.find(s => s.subject === b.subject);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

    return (
      <QuestionWrapper 
        title="Subject Matrix" 
        subtitle="For subjects you like, rate how much you LOVE it vs how CAPABLE you are."
        canProceed={selections.length > 0}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {sortedSubjects.map(({ category, subject }) => {
            const selection = selections.find(s => s.subject === subject);
            return (
              <div 
                key={subject}
                onClick={() => toggleSubject(subject)}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all flex flex-col gap-3",
                  selection
                    ? "bg-slate-800 border-blue-500" 
                    : "bg-slate-900 border-slate-800 hover:border-slate-600"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className={selection ? "text-white font-medium" : "text-slate-400"}>{subject}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{category}</span>
                  </div>
                </div>

                {selection && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
                    {/* Love Rating */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Heart className="w-3 h-3 text-pink-500" /> Love / Interest
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <div 
                            key={star}
                            className={cn(
                              "w-6 h-1.5 rounded-full cursor-pointer transition-colors",
                              star <= selection.love ? "bg-pink-500" : "bg-slate-700"
                            )}
                            onClick={(e) => updateRating(subject, 'love', star, e)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Capable Rating */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Zap className="w-3 h-3 text-yellow-500" /> Capable / Skill
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <div 
                            key={star}
                            className={cn(
                              "w-6 h-1.5 rounded-full cursor-pointer transition-colors",
                              star <= selection.capable ? "bg-yellow-500" : "bg-slate-700"
                            )}
                            onClick={(e) => updateRating(subject, 'capable', star, e)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </QuestionWrapper>
    );
  }

  // Q5: Flow State
  if (step === 'q5') {
    const flowData = localAnswers.q5_flow_state || { activity: '', engaging_factors: [] };
    const factors = [
      "It challenged me just right", "I was creating something", "I was with people I like",
      "I was learning something new", "I had clear goals/progress", "I had freedom to do it my way",
      "It helped someone", "It was competitive/playful"
    ];

    return (
      <QuestionWrapper 
        title="Flow State Memory" 
        subtitle="Describe the last time you were so absorbed you lost track of time"
        canProceed={!!flowData.activity && flowData.engaging_factors.length > 0}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>What were you doing?</Label>
            <Textarea 
              value={flowData.activity}
              onChange={(e) => updateAnswer('q5_flow_state', { ...flowData, activity: e.target.value })}
              placeholder="e.g. Editing a video for my friend's birthday..."
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label>What made it engaging? (Pick top 2)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {factors.map(factor => (
                <div 
                  key={factor}
                  onClick={() => {
                    const current = flowData.engaging_factors;
                    if (current.includes(factor)) {
                      updateAnswer('q5_flow_state', { ...flowData, engaging_factors: current.filter(f => f !== factor) });
                    } else if (current.length < 2) {
                      updateAnswer('q5_flow_state', { ...flowData, engaging_factors: [...current, factor] });
                    }
                  }}
                  className={cn(
                    "p-3 rounded border cursor-pointer text-sm",
                    flowData.engaging_factors.includes(factor)
                      ? "bg-purple-600/20 border-purple-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  )}
                >
                  {factor}
                </div>
              ))}
            </div>
          </div>
        </div>
      </QuestionWrapper>
    );
  }

  // Part 2 Intro
  if (step === 'part2_intro') {
    return (
      <div className="text-center space-y-6 py-12 animate-in zoom-in duration-300">
        <div className="text-4xl">💪</div>
        <h2 className="text-2xl font-bold text-white">Part 2: What You're Good At</h2>
        <p className="text-slate-300">
          Now let's look at your natural strengths and skills.
        </p>
        <Button onClick={onNext} size="lg" className="bg-green-600 hover:bg-green-700">
          Continue <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Q6: Strongest Skills (Pick 5 + Custom)
  if (step === 'q6') {
    const skillCategories = {
      "Creative": ["Visual design", "Writing/storytelling", "Original ideas", "Artistic/musical"],
      "Analytical": ["Math/logic", "Research", "Problem-solving", "Pattern spotting"],
      "Technical": ["Tech/computers", "Building/fixing", "Systems thinking", "Coding"],
      "People": ["Explaining clearly", "Empathy", "Public speaking", "Making people comfortable"],
      "Organizational": ["Planning", "Detail-oriented", "Leading projects", "Focus"],
      "Physical": ["Athletics", "Manual precision", "Endurance"]
    };
    
    const selectedSkills = localAnswers.q6_strongest_skills || [];

    return (
      <QuestionWrapper 
        title="Strongest Skills" 
        subtitle={`Select your top 5 strengths (${selectedSkills.length}/5)`}
        canProceed={selectedSkills.length === 5}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="space-y-4">
          {/* Custom Input */}
          <div className="flex gap-2">
            <Input 
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Add a custom skill..."
              className="bg-slate-800 border-slate-700"
              onKeyDown={(e) => e.key === 'Enter' && addCustomSkill()}
            />
            <Button onClick={addCustomSkill} disabled={!customSkill.trim() || selectedSkills.length >= 5} variant="secondary">
              Add
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto pr-2">
            {Object.entries(skillCategories).map(([category, skills]) => (
              <div key={category} className="space-y-2">
                <h4 className="font-semibold text-green-400 text-sm">{category}</h4>
                <div className="space-y-1">
                  {skills.map(skill => (
                    <div 
                      key={skill}
                      onClick={() => {
                        if (selectedSkills.includes(skill)) {
                          updateAnswer('q6_strongest_skills', selectedSkills.filter(s => s !== skill));
                        } else if (selectedSkills.length < 5) {
                          updateAnswer('q6_strongest_skills', [...selectedSkills, skill]);
                        }
                      }}
                      className={cn(
                        "p-2 rounded border cursor-pointer text-sm transition-colors",
                        selectedSkills.includes(skill)
                          ? "bg-green-600/20 border-green-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Selected Skills Summary */}
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              {selectedSkills.map(skill => (
                <Badge key={skill} variant="secondary" className="bg-green-900/30 text-green-300 hover:bg-green-900/50 cursor-pointer" onClick={() => updateAnswer('q6_strongest_skills', selectedSkills.filter(s => s !== skill))}>
                  {skill} <span className="ml-1 text-xs">×</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </QuestionWrapper>
    );
  }

  // Q7: Proud Moments
  if (step === 'q7') {
    const options = [
      "Excelled in a tough subject", "Created something people loved", "Led a successful project/team",
      "Taught yourself something difficult", "Helped someone through a hard time", "Won a competition/award",
      "Built or fixed something", "Performed well under pressure", "Stuck with something long-term"
    ];
    const selected = localAnswers.q7_proud_moments || [];

    return (
      <QuestionWrapper 
        title="Proud Moments" 
        subtitle="What have you accomplished that made you proud? (Pick up to 3)"
        canProceed={selected.length > 0}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="grid gap-2">
          {options.map(option => (
            <div 
              key={option}
              onClick={() => {
                if (selected.includes(option)) {
                  updateAnswer('q7_proud_moments', selected.filter(s => s !== option));
                } else if (selected.length < 3) {
                  updateAnswer('q7_proud_moments', [...selected, option]);
                }
              }}
              className={cn(
                "p-3 rounded border cursor-pointer",
                selected.includes(option)
                  ? "bg-amber-600/20 border-amber-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              )}
            >
              {option}
            </div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  // Q8-Q13 Simplified for brevity but fully functional
  if (step === 'q8') {
    const options = ["Reading", "Videos/demos", "Hands-on doing", "One-on-one mentoring", "Structured classes", "Trial and error"];
    const selected = localAnswers.q8_learning_style || [];
    return (
      <QuestionWrapper title="Learning Style" subtitle="How do you learn best? (Pick 2)" canProceed={selected.length === 2} onBack={onBack} onNext={onNext}>
        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => (
            <div key={opt} onClick={() => {
              if (selected.includes(opt)) updateAnswer('q8_learning_style', selected.filter(s => s !== opt));
              else if (selected.length < 2) updateAnswer('q8_learning_style', [...selected, opt]);
            }} className={cn("p-4 rounded border cursor-pointer text-center", selected.includes(opt) ? "bg-blue-600/20 border-blue-500" : "bg-slate-800 border-slate-700")}>{opt}</div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  if (step === 'q9') {
    const options = ["Tech help", "Creative ideas", "Explaining concepts", "Organizing", "Emotional support", "Homework help", "Making/fixing", "Decisions", "Entertainment", "Sports"];
    const selected = localAnswers.q9_help_requests || [];
    return (
      <QuestionWrapper title="What People Ask For" subtitle="What do others ask you for help with? (Select all that apply)" onBack={onBack} onNext={onNext}>
        <div className="grid grid-cols-2 gap-2">
          {options.map(opt => (
            <div key={opt} onClick={() => {
              if (selected.includes(opt)) updateAnswer('q9_help_requests', selected.filter(s => s !== opt));
              else updateAnswer('q9_help_requests', [...selected, opt]);
            }} className={cn("p-3 rounded border cursor-pointer text-sm", selected.includes(opt) ? "bg-purple-600/20 border-purple-500" : "bg-slate-800 border-slate-700")}>{opt}</div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  if (step === 'q10') {
    const data = localAnswers.q10_fast_learner || { is_fast_learner: false };
    return (
      <QuestionWrapper title="Fast Learner Moment" subtitle="Is there something you picked up way faster than others?" canProceed={!data.is_fast_learner || (!!data.topic && !!data.speed)} onBack={onBack} onNext={onNext}>
        <div className="space-y-6">
          <div className="flex gap-4">
            <Button variant={data.is_fast_learner ? "default" : "outline"} onClick={() => updateAnswer('q10_fast_learner', { ...data, is_fast_learner: true })}>Yes</Button>
            <Button variant={!data.is_fast_learner ? "default" : "outline"} onClick={() => updateAnswer('q10_fast_learner', { is_fast_learner: false })}>No</Button>
          </div>
          {data.is_fast_learner && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <Label>What was it?</Label>
                <Input value={data.topic || ''} onChange={e => updateAnswer('q10_fast_learner', { ...data, topic: e.target.value })} placeholder="e.g. Learning to edit videos" />
              </div>
              <div className="space-y-2">
                <Label>How much faster?</Label>
                <div className="flex gap-2">
                  {['bit', 'noticeably', 'way'].map(s => (
                    <div key={s} onClick={() => updateAnswer('q10_fast_learner', { ...data, speed: s })} 
                      className={cn("px-4 py-2 rounded border cursor-pointer capitalize", data.speed === s ? "bg-blue-600 border-blue-500" : "bg-slate-800 border-slate-700")}>{s} faster</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </QuestionWrapper>
    );
  }

  // Q11: Zone Activity (REMOVED - Duplicate of Q5)
  // if (step === 'q11') { ... }

  if (step === 'q12') {
    const ratings = localAnswers.q12_confidence || { creative: 3, analytical: 3, technical: 3, people: 3, organizational: 3, physical: 3 };
    const areas = ["Creative", "Analytical", "Technical", "People", "Organizational", "Physical"];
    return (
      <QuestionWrapper title="Confidence Rating" subtitle="Rate your overall confidence in each area" onBack={onBack} onNext={onNext}>
        <div className="space-y-4">
          {areas.map(area => {
            const key = area.toLowerCase() as keyof typeof ratings;
            return (
              <div key={area} className="flex items-center justify-between">
                <span className="text-slate-300">{area}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className={cn("w-6 h-6 cursor-pointer", star <= ratings[key] ? "fill-amber-400 text-amber-400" : "text-slate-700")} 
                      onClick={() => updateAnswer('q12_confidence', { ...ratings, [key]: star })} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </QuestionWrapper>
    );
  }

  if (step === 'q13') {
    return (
      <QuestionWrapper title="Recognition Pattern" subtitle="What do people often compliment you on?" canProceed={!!localAnswers.q13_recognition} onBack={onBack} onNext={onNext}>
        <div className="space-y-4">
          <Textarea 
            value={localAnswers.q13_recognition || ''} 
            onChange={e => updateAnswer('q13_recognition', e.target.value)}
            placeholder="e.g. Being calm under pressure, my drawings..."
            className="min-h-[150px] bg-slate-800 border-slate-700"
          />
          <div className="flex items-center gap-2">
            <Checkbox id="none" onCheckedChange={(checked) => {
              if (checked) updateAnswer('q13_recognition', "People don't really give me specific compliments");
              else updateAnswer('q13_recognition', "");
            }} />
            <Label htmlFor="none" className="text-slate-400">People don't really give me specific compliments</Label>
          </div>
        </div>
      </QuestionWrapper>
    );
  }

  if (step === 'ai_intro') {
    return (
      <div className="text-center space-y-6 py-12 animate-in zoom-in duration-300">
        <div className="text-4xl">🤖</div>
        <h2 className="text-2xl font-bold text-white">Assessment Complete!</h2>
        <p className="text-slate-300 max-w-md mx-auto">
          Great job! Now for the final step: a quick 5-minute chat with our AI advisor to connect the dots and build your profile.
        </p>
        <Button onClick={onNext} size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          Start Conversation <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    );
  }

  return <div>Unknown step</div>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  UserIcon,
  AtSignIcon,
  MailIcon,
  Code,
  Palette,
  Briefcase,
  Users,
  Lightbulb,
  X,
  ArrowLeft,
  GraduationCap,
  School,
  Building,
  Globe,
} from "lucide-react";

type Skill = {
  id?: string;
  name: string;
  category: string;
};

export default function FinishProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [educationLevel, setEducationLevel] = useState<'high_school' | 'university' | 'unaffiliated'>('high_school');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'th'>('en');
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // State for username validation
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Skill categories and predefined skills
  const skillCategories = {
    programming: {
      name: "Programming & Development",
      icon: <Code className="h-4 w-4" />,
      description: "Software development and technical programming skills",
      skills: [
        "Frontend Development",
        "Backend Development",
        "Full-Stack Development",
        "Mobile Development",
        "Game Development",
        "Data Science",
        "Machine Learning",
        "DevOps",
        "Web Development",
        "API Development",
      ],
    },
    design: {
      name: "Art and Design",
      icon: <Palette className="h-4 w-4" />,
      description: "Visual arts, design, and creative visual skills",
      skills: [
        "UI/UX Design",
        "Graphic Design",
        "Drawing",
        "Illustration",
        "Branding",
        "Visual Design",
        "Product Design",
        "Web Design",
        "User Research",
        "Prototyping",
      ],
    },
    business: {
      name: "Business & Operations",
      icon: <Briefcase className="h-4 w-4" />,
      description:
        "Business development, operations, and customer-facing skills",
      skills: [
        "Customer Onboarding",
        "Sales",
        "Business Development",
        "Operations Management",
        "Strategic Planning",
        "Financial Analysis",
        "Market Research",
        "Customer Success",
      ],
    },
    soft: {
      name: "Soft Skills",
      icon: <Users className="h-4 w-4" />,
      description: "Interpersonal and professional development skills",
      skills: [
        "Leadership",
        "Communication",
        "Project Management",
        "Teaching",
        "Public Speaking",
        "Team Collaboration",
        "Problem Solving",
        "Time Management",
      ],
    },
    content: {
      name: "Content",
      icon: <Lightbulb className="h-4 w-4" />,
      description: "Content creation, digital media, and storytelling skills",
      skills: [
        "Writing",
        "Video Editing",
        "Photography",
        "Music",
        "Content Creation",
        "Social Media",
        "Marketing",
        "Storytelling",
        "Blogging",
        "Copywriting",
      ],
    },
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        console.error("Error fetching user or no user logged in:", error);
        router.push("/login");
        return;
      }
      setUser(data.user);

      // Fetch existing profile data to pre-fill the form
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileData) {
        setFullName(profileData.full_name || "");
        setUsername(profileData.username || "");
        setDateOfBirth(profileData.date_of_birth || "");
        setEducationLevel(profileData.education_level || 'high_school');
        setPreferredLanguage(profileData.preferred_language || 'en');
      }

      // Fetch existing skills from interests table
      const { data: skillsData, error: skillsError } = await supabase
        .from("interests")
        .select("*")
        .eq("user_id", data.user.id)
        .eq("type", "skill");

      if (skillsError) {
        console.error("Error fetching skills:", skillsError);
      } else if (skillsData) {
        // Map skills from database
        const skills = skillsData.map((skill) => ({
          id: skill.id,
          name: skill.name,
          category: skill.emotion, // Using emotion field to store category
        }));
        setSelectedSkills(skills);
      }

      setLoading(false);
    };
    fetchUser();
  }, [supabase, router]);

  // Check if username is unique
  const checkUsernameUnique = async (username: string) => {
    if (!username) return;

    setIsCheckingUsername(true);
    setUsernameError("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user?.id || "") // Exclude current user
      .maybeSingle();

    setIsCheckingUsername(false);

    if (error) {
      console.error("Error checking username:", error);
      setUsernameError("Error checking username availability");
      return false;
    }

    if (data) {
      setUsernameError("Username already taken");
      return false;
    }

    return true;
  };

  const handleAddSkill = (skillName: string, category: string) => {
    // Check if skill already exists
    if (selectedSkills.some((skill) => skill.name === skillName)) {
      return;
    }

    // Check if limit of 5 skills is reached
    if (selectedSkills.length >= 5) {
      alert(
        "You can only select up to 5 skills. Please remove a skill before adding a new one."
      );
      return;
    }

    const newSkill: Skill = {
      name: skillName,
      category,
    };

    setSelectedSkills([...selectedSkills, newSkill]);
  };

  const handleRemoveSkill = (skillName: string) => {
    setSelectedSkills(
      selectedSkills.filter((skill) => skill.name !== skillName)
    );
  };

  const handleProfileUpdate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setSubmitting(true);

    if (!user) {
      console.error("User not available for profile update");
      setSubmitting(false);
      return;
    }

    // Check if username is unique before proceeding
    const isUsernameUnique = await checkUsernameUnique(username);
    if (!isUsernameUnique) {
      setSubmitting(false);
      return;
    }

    try {
      // Update profile
      const profileUpdates = {
        id: user.id,
        full_name: fullName,
        username: username,
        date_of_birth: dateOfBirth,
        education_level: educationLevel,
        preferred_language: preferredLanguage,
        updated_at: new Date(),
        avatar_url: user.user_metadata?.avatar_url || null,
        email: user.email,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileUpdates);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        const errorMessage = profileError.message || 
                            profileError.hint || 
                            JSON.stringify(profileError) || 
                            "An unknown error occurred";
        alert("Error updating profile: " + errorMessage);
        setSubmitting(false);
        return;
      }

      // Delete existing skills first
      const { error: deleteError } = await supabase
        .from("interests")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "skill");

      if (deleteError) {
        console.error("Error deleting existing skills:", deleteError);
      }

      // Save skills to interests table
      if (selectedSkills.length > 0) {
        const skillsToSave = selectedSkills.map((skill) => ({
          user_id: user.id,
          name: skill.name,
          type: "skill",
          emotion: skill.category, // Store category in emotion field
          level: 60, // Default level for skills
          created_at: new Date(),
        }));

        const { error: skillsError } = await supabase
          .from("interests")
          .insert(skillsToSave);

        if (skillsError) {
          console.error("Error saving skills:", skillsError);
          const errorMessage = skillsError.message || 
                              skillsError.hint || 
                              JSON.stringify(skillsError) || 
                              "An unknown error occurred";
          alert("Error saving skills: " + errorMessage);
          setSubmitting(false);
          return;
        }
      }

      // Scroll to top before redirecting
      window.scrollTo(0, 0);
      
      // Redirect to user profile page after profile and skills are updated
      // (skip the interests flow for now)
      router.push("/me");
    } catch (error) {
      console.error("Error in profile update process:", error);
      alert("An unexpected error occurred. Please try again.");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-center text-muted-foreground">
              Loading your profile...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Complete Your Profile
          </CardTitle>
          <CardDescription className="text-center">
            Set up your profile and select your skills before continuing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-8">
            {/* Basic Profile Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">
                Basic Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <MailIcon className="h-4 w-4" /> Email
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    id="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" /> Full Name
                </Label>
                <Input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <AtSignIcon className="h-4 w-4" /> Username (unique)
                </Label>
                <Input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (e.target.value) checkUsernameUnique(e.target.value);
                  }}
                  required
                  placeholder="Choose a unique username"
                  className={usernameError ? "border-red-500" : ""}
                />
                {usernameError && (
                  <p className="text-sm text-red-500 mt-1">{usernameError}</p>
                )}
                {isCheckingUsername && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Checking username availability...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="dateOfBirth"
                  className="flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4" /> Date of Birth
                </Label>
                <Input
                  type="date"
                  id="dateOfBirth"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Education & Background Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">
                Education & Background
              </h3>
              <p className="text-sm text-muted-foreground">
                Help us personalize your learning journey based on your current education level
              </p>

              {/* Education Level Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Current Education Level
                </Label>
                <div className="grid grid-cols-1 gap-3 max-w-md">
                  <Button
                    type="button"
                    variant={educationLevel === 'high_school' ? "default" : "outline"}
                    className="h-auto p-4 justify-start text-left"
                    onClick={() => setEducationLevel('high_school')}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <School className="h-5 w-5 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">High School</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Currently in high school
                        </div>
                      </div>
                    </div>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={educationLevel === 'university' ? "default" : "outline"}
                    className="h-auto p-4 justify-start text-left"
                    onClick={() => setEducationLevel('university')}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <GraduationCap className="h-5 w-5 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">University</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Currently in university
                        </div>
                      </div>
                    </div>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={educationLevel === 'unaffiliated' ? "default" : "outline"}
                    className="h-auto p-4 justify-start text-left"
                    onClick={() => setEducationLevel('unaffiliated')}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Building className="h-5 w-5 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">Unaffiliated</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Not currently in formal education
                        </div>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            {/* Language Preference Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">
                Language Preference
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose your preferred language for the interface
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                <Button
                  type="button"
                  variant={preferredLanguage === 'en' ? "default" : "outline"}
                  className="h-auto p-4 justify-start text-left"
                  onClick={() => setPreferredLanguage('en')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 flex-shrink-0">
                      <span className="text-lg">🇺🇸</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">English</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        English
                      </div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  type="button"
                  variant={preferredLanguage === 'th' ? "default" : "outline"}
                  className="h-auto p-4 justify-start text-left"
                  onClick={() => setPreferredLanguage('th')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 flex-shrink-0">
                      <span className="text-lg">🇹🇭</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Thai</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        ภาษาไทย
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Skills Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Your Skills</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Choose your top 5 skills you excel in
              </p>
              <p className="text-xs text-muted-foreground">
                First select a skill category, then choose specific skills from
                that category
              </p>

              {!selectedCategory ? (
                /* Step 1: Category Selection */
                <div className="space-y-4">
                  <h4 className="font-medium">
                    Step 1: Choose a skill category
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(skillCategories).map(
                      ([categoryKey, category]) => (
                        <Button
                          key={categoryKey}
                          type="button"
                          variant="outline"
                          className="w-full h-auto p-4 justify-start text-left"
                          onClick={() => setSelectedCategory(categoryKey)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="flex-shrink-0 mt-1">
                              {category.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm mb-1">
                                {category.name}
                              </div>
                              <div className="text-xs text-muted-foreground leading-relaxed">
                                {category.description}
                              </div>
                            </div>
                          </div>
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                /* Step 2: Skill Selection within Category */
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="h-8 px-2"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <div className="flex items-center gap-2">
                      {
                        skillCategories[
                          selectedCategory as keyof typeof skillCategories
                        ]?.icon
                      }
                      <span className="font-medium">
                        {
                          skillCategories[
                            selectedCategory as keyof typeof skillCategories
                          ]?.name
                        }
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {skillCategories[
                      selectedCategory as keyof typeof skillCategories
                    ]?.skills.map((skillName) => {
                      const isSelected = selectedSkills.some(
                        (s) => s.name === skillName
                      );
                      const canAdd = selectedSkills.length < 5;
                      return (
                        <Button
                          key={skillName}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="text-xs h-8 justify-start"
                          disabled={!isSelected && !canAdd}
                          onClick={() => {
                            if (isSelected) {
                              handleRemoveSkill(skillName);
                            } else {
                              handleAddSkill(skillName, selectedCategory);
                            }
                          }}
                        >
                          {skillName}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Skills Summary */}
              {selectedSkills.length > 0 && (
                <div className="space-y-3 mt-6 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium">
                    Selected Skills ({selectedSkills.length}/5)
                    {selectedSkills.length === 5 && (
                      <span className="text-green-600 text-sm ml-2">
                        ✓ Complete
                      </span>
                    )}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((skill) => (
                      <div
                        key={skill.name}
                        className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full"
                      >
                        <div className="flex items-center gap-1">
                          {
                            skillCategories[
                              skill.category as keyof typeof skillCategories
                            ]?.icon
                          }
                          <span className="font-medium text-xs">
                            {skill.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSkill(skill.name)}
                          className="h-4 w-4 p-0 hover:bg-destructive/20"
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !!usernameError}
            >
              {submitting
                ? "Saving Profile & Skills..."
                : "Save Profile & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

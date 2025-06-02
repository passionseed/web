"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/utils/supabase/client";
import {
  Trees,
  Sparkles,
  Sun,
  Leaf,
  Flower,
  DropletIcon,
  Sprout,
} from "lucide-react";

type OnboardingStep =
  | "intro"
  | "choose-seed"
  | "name-passion"
  | "plant-seed"
  | "first-reflection"
  | "complete";

type SeedType = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

interface PassionTreeGardenProps {
  userId: string;
}

export function PassionTreeGarden({ userId }: PassionTreeGardenProps) {
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("intro");
  const [loading, setLoading] = useState(true);
  const [hasTree, setHasTree] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState<SeedType | null>(null);
  const [passionName, setPassionName] = useState("");
  const [reflection, setReflection] = useState("");
  const [isWatering, setIsWatering] = useState(false);
  const [growthLevel, setGrowthLevel] = useState(0);
  const [treeData, setTreeData] = useState<any>(null);

  const seedTypes: SeedType[] = [
    {
      id: "creative",
      name: "Creative Seed",
      description: "For artistic and expressive passions",
      icon: <Sparkles className="h-10 w-10" />,
      color: "bg-pink-500",
    },
    {
      id: "logical",
      name: "Logical Seed",
      description: "For analytical and problem-solving passions",
      icon: <Sun className="h-10 w-10" />,
      color: "bg-blue-500",
    },
    {
      id: "physical",
      name: "Physical Seed",
      description: "For movement and health-related passions",
      icon: <Leaf className="h-10 w-10" />,
      color: "bg-green-500",
    },
    {
      id: "social",
      name: "Social Seed",
      description: "For community and relationship-based passions",
      icon: <Trees className="h-10 w-10" />,
      color: "bg-purple-500",
    },
  ];

  useEffect(() => {
    async function checkExistingTree() {
      setLoading(true);

      // Check if user already has a passion tree
      const { data: passionTrees, error } = await supabase
        .from("passion_trees")
        .select("*")
        .eq("user_id", userId)
        .limit(1);

      if (error) {
        console.error("Error checking passion trees:", error);
      } else if (passionTrees && passionTrees.length > 0) {
        setHasTree(true);
        setTreeData(passionTrees[0]);
        setGrowthLevel(calculateGrowthLevel(passionTrees[0]));
      }

      setLoading(false);
    }

    checkExistingTree();
  }, [userId, supabase]);

  const calculateGrowthLevel = (tree: any) => {
    const stageMap: Record<string, number> = {
      Seed: 0,
      Sprout: 25,
      Sapling: 50,
      Tree: 75,
      "Mature Tree": 100,
    };

    return stageMap[tree.growth_stage] || 0;
  };

  const nextStep = () => {
    const steps: OnboardingStep[] = [
      "intro",
      "choose-seed",
      "name-passion",
      "plant-seed",
      "first-reflection",
      "complete",
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleSeedSelection = (seed: SeedType) => {
    setSelectedSeed(seed);
    nextStep();
  };

  const handleNameSubmit = () => {
    if (passionName.trim()) {
      nextStep();
    }
  };

  const handlePlantSeed = async () => {
    if (!selectedSeed || !passionName.trim()) return;

    setLoading(true);

    // Create a new passion tree
    const { data: tree, error: treeError } = await supabase
      .from("passion_trees")
      .insert([
        {
          user_id: userId,
          name: passionName,
          category: selectedSeed.id,
          growth_stage: "Seed",
          depth: 1.0,
          mastery: 1.0,
        },
      ])
      .select()
      .single();

    if (treeError) {
      console.error("Error creating passion tree:", treeError);
      setLoading(false);
      return;
    }

    if (tree) {
      setTreeData(tree);
      setHasTree(true);
      nextStep();
    }

    setLoading(false);
  };

  const handleReflectionSubmit = async () => {
    if (!reflection.trim() || !treeData) return;

    setLoading(true);
    setIsWatering(true);

    // Save reflection
    const { error: reflectionError } = await supabase
      .from("reflections")
      .insert([
        {
          user_id: userId,
          content: reflection,
        },
      ]);

    if (reflectionError) {
      console.error("Error saving reflection:", reflectionError);
    }

    // Update tree growth stage
    const { error: treeError } = await supabase
      .from("passion_trees")
      .update({
        growth_stage: "Sprout",
        depth: 1.5,
      })
      .eq("id", treeData.id);

    if (treeError) {
      console.error("Error updating tree:", treeError);
    }

    // Simulate watering animation
    setTimeout(() => {
      setIsWatering(false);
      setGrowthLevel(25); // Sprout level
      nextStep();
    }, 2000);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container py-10 px-4 md:px-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-xl text-white">Loading your passion garden...</p>
      </div>
    );
  }

  // If user already has a tree, show the garden view
  if (hasTree && currentStep === "intro") {
    return (
      <div className="container py-10 px-4 md:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-8">
          Your Passion Tree Garden
        </h1>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="bg-white/10 backdrop-blur-sm border-none text-white">
            <CardHeader>
              <CardTitle>{treeData.name}</CardTitle>
              <CardDescription className="text-white/70">
                {treeData.growth_stage} • Planted{" "}
                {new Date(treeData.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center p-6">
                {growthLevel < 25 ? (
                  <Leaf className="h-24 w-24 text-green-400" />
                ) : growthLevel < 50 ? (
                  <Sprout className="h-24 w-24 text-green-400" />
                ) : growthLevel < 75 ? (
                  <Flower className="h-24 w-24 text-green-500" />
                ) : (
                  <Trees className="h-24 w-24 text-green-600" />
                )}
                <Progress
                  value={growthLevel}
                  className="w-full mt-4 h-2 bg-white/20"
                />
                <p className="text-white/70 mt-2">
                  Growth Progress: {growthLevel}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-none text-white">
            <CardHeader>
              <CardTitle>Daily Reflection</CardTitle>
              <CardDescription className="text-white/70">
                Water your passion with reflection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="How did you engage with your passion today? What did you learn or discover?"
                className="min-h-[150px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                onClick={handleReflectionSubmit}
                disabled={!reflection.trim() || isWatering}
              >
                {isWatering ? (
                  <>
                    <DropletIcon className="h-4 w-4 animate-bounce" />
                    Watering...
                  </>
                ) : (
                  <>
                    <DropletIcon className="h-4 w-4" />
                    Water with Reflection
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Onboarding flow
  return (
    <div className="container py-10 px-4 md:px-6 flex flex-col items-center justify-center min-h-[80vh]">
      <AnimatePresence mode="wait">
        {currentStep === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto text-center text-white"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <Leaf className="h-20 w-20 mx-auto mb-6 text-green-400" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-4">
              Let's Grow Your Passion Tree
            </h1>
            <p className="mb-6 text-white/80">
              Your Passion Tree is a living map of your interests and
              motivations. As you engage with your passions and reflect on them,
              your tree will grow and flourish.
            </p>
            <Button
              onClick={nextStep}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Start Growing
            </Button>
          </motion.div>
        )}

        {currentStep === "choose-seed" && (
          <motion.div
            key="choose-seed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center text-white"
          >
            <h1 className="text-3xl font-bold mb-4">Choose Your Seed</h1>
            <p className="mb-8 text-white/80">
              Select a seed type that best represents the passion you want to
              cultivate.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seedTypes.map((seed) => (
                <motion.div
                  key={seed.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="bg-white/10 backdrop-blur-sm border-none text-white cursor-pointer"
                    onClick={() => handleSeedSelection(seed)}
                  >
                    <CardContent className="pt-6 flex items-center flex-col">
                      <div className={`rounded-full p-4 ${seed.color} mb-4`}>
                        {seed.icon}
                      </div>
                      <h3 className="text-xl font-medium mb-2">{seed.name}</h3>
                      <p className="text-sm text-white/70">
                        {seed.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {currentStep === "name-passion" && selectedSeed && (
          <motion.div
            key="name-passion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto text-center text-white"
          >
            <div
              className={`rounded-full p-4 ${selectedSeed.color} mx-auto mb-6 inline-block`}
            >
              {selectedSeed.icon}
            </div>
            <h1 className="text-3xl font-bold mb-4">Name Your Passion</h1>
            <p className="mb-6 text-white/80">
              Give a name to the passion you want to grow.
            </p>

            <div className="space-y-4">
              <Input
                placeholder="e.g., Digital Art, Programming, Yoga..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                value={passionName}
                onChange={(e) => setPassionName(e.target.value)}
              />
              <Button
                onClick={handleNameSubmit}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={!passionName.trim()}
              >
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {currentStep === "plant-seed" && selectedSeed && (
          <motion.div
            key="plant-seed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto text-center text-white"
          >
            <h1 className="text-3xl font-bold mb-4">Plant Your Seed</h1>
            <p className="mb-6 text-white/80">
              You're about to plant{" "}
              <span className="font-medium">{passionName}</span>, which will
              grow as you nurture it with regular reflection and engagement.
            </p>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mb-8"
            >
              <Leaf className="h-24 w-24 mx-auto text-green-400" />
            </motion.div>

            <Button
              onClick={handlePlantSeed}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Plant Seed
            </Button>
          </motion.div>
        )}

        {currentStep === "first-reflection" && (
          <motion.div
            key="first-reflection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl mx-auto text-center text-white"
          >
            <h1 className="text-3xl font-bold mb-4">Water Your Seed</h1>
            <p className="mb-6 text-white/80">
              Take a moment to reflect on why this passion matters to you. Your
              reflection will water your seed and help it grow.
            </p>

            <Card className="bg-white/10 backdrop-blur-sm border-none text-white mb-6">
              <CardContent className="pt-6">
                <Textarea
                  placeholder="Why does this passion interest you? What do you hope to learn or achieve?"
                  className="min-h-[150px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                />
              </CardContent>
            </Card>

            <Button
              onClick={handleReflectionSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              disabled={!reflection.trim() || isWatering}
            >
              {isWatering ? (
                <>
                  <DropletIcon className="h-4 w-4 animate-bounce" />
                  Watering...
                </>
              ) : (
                <>
                  <DropletIcon className="h-4 w-4" />
                  Water with Reflection
                </>
              )}
            </Button>
          </motion.div>
        )}

        {currentStep === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto text-center text-white"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <Sprout className="h-24 w-24 mx-auto mb-6 text-green-400" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-4">
              Your Passion Is Sprouting!
            </h1>
            <p className="mb-6 text-white/80">
              Congratulations! Your passion seed has been planted and has
              already started to sprout. Return daily to reflect and water your
              passion to help it grow into a magnificent tree.
            </p>
            <Button
              onClick={() => setCurrentStep("intro")}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Visit Your Garden
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

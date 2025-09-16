"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FileJson, Rocket, CheckCircle, AlertCircle, Copy, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

const exampleJson = {
  map: {
    title: "Learn React Basics",
    description: "Master React fundamentals step by step",
    difficulty: 2,
    estimatedHours: 8,
    visibility: "public",
    metadata: {
      tags: ["react", "javascript", "frontend"],
      category: "web-development"
    }
  },
  nodes: [
    {
      id: "node_1",
      title: "React Introduction",
      description: "What is React and why use it?",
      position: { x: 100, y: 100 },
      difficulty: 1,
      estimatedMinutes: 60,
      content: {
        type: "lesson",
        text: "React is a JavaScript library for building user interfaces. It makes building interactive UIs painless by creating simple views for each state in your application.",
        codeBlocks: [
          {
            language: "jsx",
            code: "function App() {\n  return <h1>Hello, React!</h1>;\n}"
          }
        ],
        resources: [
          {
            title: "React Official Docs",
            url: "https://react.dev",
            type: "documentation"
          }
        ]
      },
      assessments: [
        {
          type: "quiz",
          isGraded: true,
          pointsPossible: 10,
          questions: [
            {
              type: "multiple_choice",
              question: "What is React?",
              options: ["A database", "A JavaScript library", "A CSS framework"],
              correctAnswer: 1,
              points: 5
            }
          ]
        }
      ]
    },
    {
      id: "node_2",
      title: "Components & JSX", 
      description: "Learn about React components and JSX syntax",
      position: { x: 300, y: 100 },
      difficulty: 2,
      estimatedMinutes: 90,
      prerequisites: ["node_1"],
      content: {
        type: "lesson",
        text: "Components are the building blocks of React applications. JSX is a syntax extension that lets you write HTML-like code in JavaScript.",
        codeBlocks: [
          {
            language: "jsx",
            code: "function Welcome(props) {\n  return <h1>Hello, {props.name}!</h1>;\n}"
          }
        ]
      },
      assessments: [
        {
          type: "project",
          isGraded: true,
          pointsPossible: 20,
          prompt: "Create a React component that displays a greeting with your name",
          requirements: ["Use JSX syntax", "Accept props", "Return a valid element"]
        }
      ]
    }
  ],
  connections: [
    {
      from: "node_1",
      to: "node_2",
      type: "prerequisite"
    }
  ]
};

export default function ProjectPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const validateJson = (jsonString: string) => {
    const errors: string[] = [];
    
    try {
      const data = JSON.parse(jsonString);
      
      // Validate map structure
      if (!data.map) errors.push("Missing 'map' object");
      else {
        if (!data.map.title) errors.push("Map title is required");
        if (!data.map.description) errors.push("Map description is required");
      }
      
      // Validate nodes
      if (!data.nodes || !Array.isArray(data.nodes)) {
        errors.push("'nodes' must be an array with at least one node");
      } else if (data.nodes.length === 0) {
        errors.push("At least one node is required");
      } else {
        data.nodes.forEach((node: any, i: number) => {
          if (!node.id) errors.push(`Node ${i + 1}: Missing 'id'`);
          if (!node.title) errors.push(`Node ${i + 1}: Missing 'title'`);
          if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
            errors.push(`Node ${i + 1}: Invalid 'position' (must have x, y coordinates)`);
          }
        });
      }
      
      // Validate connections
      if (data.connections && Array.isArray(data.connections)) {
        const nodeIds = new Set((data.nodes || []).map((n: any) => n.id));
        data.connections.forEach((conn: any, i: number) => {
          if (!nodeIds.has(conn.from)) errors.push(`Connection ${i + 1}: Invalid 'from' node ID`);
          if (!nodeIds.has(conn.to)) errors.push(`Connection ${i + 1}: Invalid 'to' node ID`);
        });
      }
      
      if (errors.length === 0) {
        setPreviewData(data);
      }
      
    } catch (e) {
      errors.push("Invalid JSON format");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleInputChange = (value: string) => {
    setJsonInput(value);
    if (value.trim()) {
      validateJson(value);
    } else {
      setValidationErrors([]);
      setPreviewData(null);
    }
  };

  const createMapFromJson = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create maps",
        variant: "destructive"
      });
      return;
    }

    if (!validateJson(jsonInput)) {
      toast({
        title: "Validation Failed",
        description: "Please fix the JSON errors before creating the map",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const response = await fetch("/api/maps/create-from-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonInput
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "🚀 Map Created Successfully!",
          description: `Created map with ${result.nodesCreated} nodes and ${result.assessmentsCreated} assessments in ${result.timeElapsed}ms`
        });
        
        // Navigate to the created map
        router.push(`/map/${result.mapId}`);
      } else {
        throw new Error(result.error || "Failed to create map");
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyExample = () => {
    setJsonInput(JSON.stringify(exampleJson, null, 2));
    handleInputChange(JSON.stringify(exampleJson, null, 2));
    toast({
      title: "Example Copied",
      description: "You can now modify and create this example map"
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to create maps from JSON</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <FileJson className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Create Map from JSON</h1>
            <p className="text-muted-foreground">
              Build complete learning maps instantly using JSON structure
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="secondary">
            <Rocket className="w-3 h-3 mr-1" />
            Instant Creation
          </Badge>
          <Badge variant="secondary">
            <CheckCircle className="w-3 h-3 mr-1" />
            Full Features
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Map</TabsTrigger>
          <TabsTrigger value="example">View Example</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* JSON Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  JSON Input
                </CardTitle>
                <CardDescription>
                  Paste your map JSON structure here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your JSON here..."
                  value={jsonInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />
                
                <div className="flex gap-2">
                  <Button 
                    onClick={copyExample} 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Use Example
                  </Button>
                  <Button
                    onClick={createMapFromJson}
                    disabled={isCreating || validationErrors.length > 0 || !jsonInput.trim()}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Create Map
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Validation & Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {validationErrors.length === 0 && jsonInput.trim() ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : validationErrors.length > 0 ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                  Validation & Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h4 className="text-red-800 font-medium mb-2">Validation Errors:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      {validationErrors.map((error, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {previewData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-green-800 font-medium mb-3">✅ Valid JSON Structure</h4>
                    <div className="text-sm text-green-700 space-y-2">
                      <div><strong>Map:</strong> {previewData.map?.title}</div>
                      <div><strong>Nodes:</strong> {previewData.nodes?.length || 0}</div>
                      <div><strong>Connections:</strong> {previewData.connections?.length || 0}</div>
                      <div><strong>Assessments:</strong> {
                        previewData.nodes?.reduce((total: number, node: any) => 
                          total + (node.assessments?.length || 0), 0
                        ) || 0
                      }</div>
                    </div>
                  </div>
                )}

                {!jsonInput.trim() && (
                  <div className="text-center text-muted-foreground py-8">
                    <FileJson className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter JSON to see validation results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="example">
          <Card>
            <CardHeader>
              <CardTitle>Example JSON Structure</CardTitle>
              <CardDescription>
                Copy this example and modify it to create your own map
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 rounded-lg p-4 overflow-auto text-sm">
                <code>{JSON.stringify(exampleJson, null, 2)}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>JSON Structure Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Required Fields:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                    <li>• <code>map.title</code> - Map title</li>
                    <li>• <code>map.description</code> - Map description</li>
                    <li>• <code>nodes</code> - Array of learning nodes</li>
                    <li>• <code>nodes[].id</code> - Unique node identifier</li>
                    <li>• <code>nodes[].title</code> - Node title</li>
                    <li>• <code>nodes[].position</code> - Node position {"{x: number, y: number}"}</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Optional Fields:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                    <li>• <code>map.difficulty</code> - Difficulty level (1-5)</li>
                    <li>• <code>map.visibility</code> - "public" or "private"</li>
                    <li>• <code>nodes[].content</code> - Rich content with text, code, resources</li>
                    <li>• <code>nodes[].assessments</code> - Quizzes, projects, reflections</li>
                    <li>• <code>connections</code> - Node prerequisite relationships</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
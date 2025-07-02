'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGraphData } from '@/lib/supabase/reflection';
import { Project } from '@/types/project';
import { ReflectionWithMetrics, Tag } from '@/types/reflection';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getEmotionColor, getEmojiForEmotion } from '@/lib/emotions';
import { ExpandedReflectionCard } from '@/components/reflection/ExpandedReflectionCard';
import dynamic from 'next/dynamic';
import { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-2d';

// --- GRAPH TYPE DEFINITIONS ---
type GraphNode = NodeObject & {
  id: string;
  type: 'project' | 'tag' | 'reflection';
  label: string;
  color: string;
  emotion?: string; 
};
type GraphLink = LinkObject;
type GraphData = { nodes: GraphNode[]; links: GraphLink[] };

// --- DYNAMIC IMPORT FOR THE GRAPH ---
const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then(mod => mod.default as any), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] flex items-center justify-center"><p>Loading Graph...</p></div>,
});

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function ReflectionHome() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [reflections, setReflections] = useState<ReflectionWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const graphRef = useRef<ForceGraphMethods>();
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { projects, reflections } = await getGraphData();
      setProjects(projects);
      setReflections(reflections);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (projects.length > 0) {
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      const tagMap = new Map<string, GraphNode>();

      projects.forEach(project => {
        nodes.push({ id: project.id, type: 'project', label: project.name, color: '#4FD1C5' });

        project.tags?.forEach(tag => {
          if (!tagMap.has(tag.id)) {
            const tagNode: GraphNode = { id: tag.id, type: 'tag', label: tag.name, color: tag.color || '#FF4136' };
            tagMap.set(tag.id, tagNode);
            nodes.push(tagNode);
          }
          links.push({ source: project.id, target: tag.id });
        });

        project.reflections?.forEach(reflection => {
          nodes.push({ 
            id: reflection.id, 
            type: 'reflection', 
            label: formatDate(reflection.created_at), 
            color: '#3182CE', 
            emotion: getEmojiForEmotion(reflection.emotion)
          });
          links.push({ source: project.id, target: reflection.id });
        });
      });

      setGraphData({ nodes, links });
    }
  }, [projects]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    clearHighlight();
    if (node.type === 'reflection') {
      setExpandedCardId(node.id);
    } else {
        const newHighlightedNodes = new Set([node.id]);
        const newHighlightedLinks = new Set();

        graphData.links.forEach(link => {
            if (link.source === node.id || link.target === node.id) {
                newHighlightedNodes.add(link.source as string);
                newHighlightedNodes.add(link.target as string);
                newHighlightedLinks.add(link);
            }
        });
        setHighlightedNodes(newHighlightedNodes);
        setHighlightedLinks(newHighlightedLinks);
    }
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(2.5, 1000);
    }
  }, [graphData.links]);

  const clearHighlight = () => {
    setHighlightedNodes(new Set());
    setHighlightedLinks(new Set());
  };

  const expandedCard = expandedCardId ? reflections.find(r => r.id === expandedCardId) : undefined;

  if (loading) {
    return <div>Loading...</div>; // Add a proper skeleton loader
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {expandedCard && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40" onClick={() => setExpandedCardId(null)} />
            <ExpandedReflectionCard reflection={expandedCard} onClose={() => setExpandedCardId(null)} />
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col min-h-screen">
        <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-background z-10">
          <h1 className="text-2xl font-semibold">Reflection Journey</h1>
          <Button onClick={() => router.push('/me/reflection/new')}><Plus className="mr-2 h-4 w-4" /> Add Reflection</Button>
        </div>

        <main className="flex-1 p-4">
          {reflections.length === 0 ? (
            <div className="text-center mt-16">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold mt-4">No reflections yet</h2>
              <Button onClick={() => router.push('/me/reflection/new')} className="mt-4">Add First Reflection</Button>
            </div>
          ) : (
            <>
              <div className="mb-8 p-4 border rounded-lg bg-card shadow-md">
                <h2 className="text-lg font-semibold mb-2">Project Connections</h2>
                <div className="w-full h-[500px] relative rounded-md overflow-hidden bg-gray-900/50">
                  <ForceGraph2D
                    ref={graphRef}
                    graphData={graphData}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={clearHighlight}
                    nodeCanvasObjectMode={() => 'after'}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.label;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'white';
                        if (node.type === 'reflection') {
                            ctx.fillText(node.emotion || '', node.x!, node.y!)
                        } else {
                            ctx.fillText(label, node.x!, node.y!)
                        }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reflections.map(reflection => (
                  <motion.div key={reflection.id} layoutId={`card-${reflection.id}`} onClick={() => setExpandedCardId(reflection.id)} className="cursor-pointer">
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-base">{reflection.project.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{formatDate(reflection.created_at)}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="line-clamp-3">{reflection.content}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
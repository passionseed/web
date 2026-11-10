"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Eye, EyeOff, X, BarChart3, MousePointerClick, Heart } from "lucide-react";
import ProductDetail from "@/components/hackathon/gallery/ProductDetail";
import { LangProvider } from "@/lib/hackathon/gallery-lang";

interface GalleryProduct {
  id: string;
  team_id: string;
  team_name: string;
  product_name: string;
  product_name_th: string | null;
  problem_statement: string;
  problem_statement_th: string | null;
  solution_description: string;
  solution_description_th: string | null;
  cover_image_url: string | null;
  additional_images: string[];
  test_mode: "direct" | "contact";
  demo_url: string | null;
  contact_email: string | null;
  line_qr_url: string | null;
  line_id: string | null;
  youtube_url: string | null;
  tags: string[];
  hackathon_year: number;
  hackathon_name: string;
  interest_count: number;
  match_count: number;
  target_personas: { who: string[]; what: string[] } | null;
  is_published: boolean;
  created_at: string;
}

export function AdminHackathonGallery() {
  const [products, setProducts] = useState<GalleryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<GalleryProduct | null>(null);
  const [analytics, setAnalytics] = useState<{
    galleryViews: number;
    viewsByProduct: Record<string, number>;
    testClicksByProduct: Record<string, number>;
    interestsByProduct: Record<string, number>;
  }>({ galleryViews: 0, viewsByProduct: {}, testClicksByProduct: {}, interestsByProduct: {} });

  useEffect(() => {
    fetch("/api/admin/hackathon/gallery")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products ?? []);
        if (data.analytics) setAnalytics(data.analytics);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const togglePublish = async (product: GalleryProduct) => {
    setToggling(product.id);
    try {
      const res = await fetch(`/api/admin/hackathon/gallery/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !product.is_published }),
      });
      if (!res.ok) throw new Error("Failed");
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_published: !product.is_published } : p
        )
      );
    } catch {
      alert("Failed to update publish state");
    } finally {
      setToggling(null);
    }
  };

  const published = products.filter((p) => p.is_published).length;
  const pending = products.length - published;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Submissions</CardDescription>
            <CardTitle className="text-3xl">{products.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Published</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{published}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{pending}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Gallery Page Views</CardDescription>
            <CardTitle className="text-3xl text-blue-500">{analytics.galleryViews}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5" /> Product Clicks</CardDescription>
            <CardTitle className="text-3xl text-violet-500">{Object.values(analytics.viewsByProduct).reduce((a, b) => a + b, 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Test Product Clicks</CardDescription>
            <CardTitle className="text-3xl text-orange-500">{Object.values(analytics.testClicksByProduct).reduce((a, b) => a + b, 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Total Interests</CardDescription>
            <CardTitle className="text-3xl text-rose-500">{Object.values(analytics.interestsByProduct).reduce((a, b) => a + b, 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gallery Submissions</CardTitle>
          <CardDescription>Review and publish team product submissions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead className="text-center">Test Clicks</TableHead>
                  <TableHead className="text-center">Interests</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead>Publish</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium max-w-[180px]">
                      <p className="truncate">{product.product_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.problem_statement}</p>
                    </TableCell>
                    <TableCell className="text-sm">{product.team_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {product.tags.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{product.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(product.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_published ? "default" : "outline"} className={product.is_published ? "bg-emerald-600" : ""}>
                        {product.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {analytics.viewsByProduct[product.id] || 0}
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {analytics.testClicksByProduct[product.id] || 0}
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {analytics.interestsByProduct[product.id] || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setPreviewing(product)}>
                          <Eye className="h-3 w-3" /> Preview
                        </Button>
                        {product.demo_url && (
                          <a
                            href={product.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Demo URL"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant={product.is_published ? "outline" : "default"}
                          onClick={() => togglePublish(product)}
                          disabled={toggling === product.id}
                          className="gap-1.5 text-xs"
                        >
                          {toggling === product.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : product.is_published ? (
                            <><EyeOff className="h-3 w-3" /> Unpublish</>
                          ) : (
                            <><Eye className="h-3 w-3" /> Publish</>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview modal */}
      {previewing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewing(null)}>
          <div
            className="fixed inset-4 md:inset-8 lg:inset-12 rounded-xl overflow-hidden flex flex-col bg-[#0a0f16]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-white/10 bg-[#0a0f16] shrink-0">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Preview: {previewing.product_name}
              </span>
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-white/60 hover:text-white" onClick={() => setPreviewing(null)}>
                <X className="h-3 w-3" /> Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <LangProvider>
                <ProductDetail
                  product={{
                    id: previewing.id,
                    team_id: previewing.team_id,
                    product_name: previewing.product_name,
                    product_name_th: previewing.product_name_th,
                    problem_statement: previewing.problem_statement,
                    problem_statement_th: previewing.problem_statement_th,
                    solution_description: previewing.solution_description,
                    solution_description_th: previewing.solution_description_th,
                    cover_image_url: previewing.cover_image_url,
                    additional_images: previewing.additional_images,
                    test_mode: previewing.test_mode,
                    demo_url: previewing.demo_url,
                    contact_email: previewing.contact_email,
                    line_qr_url: previewing.line_qr_url,
                    line_id: previewing.line_id,
                    youtube_url: previewing.youtube_url,
                    tags: previewing.tags,
                    hackathon_year: previewing.hackathon_year,
                    hackathon_name: previewing.hackathon_name,
                    interest_count: previewing.interest_count,
                    match_count: previewing.match_count,
                    target_personas: previewing.target_personas,
                    created_at: previewing.created_at,
                    team: { name: previewing.team_name, members: [] },
                  }}
                />
              </LangProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

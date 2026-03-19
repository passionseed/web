import { notFound } from "next/navigation";
import * as fs from "fs";
import * as path from "path";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

interface DocPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDocContent(slug: string[]): { content: string; title: string } | null {
  const docsDir = path.join(process.cwd(), "docs", "fi");
  const filePath = path.join(docsDir, ...slug) + ".md";

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    // Extract title from first heading or filename
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug[slug.length - 1];
    return { content, title };
  } catch {
    return null;
  }
}

function parseMarkdown(content: string): string {
  // Simple markdown to HTML conversion
  let html = content
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-white/5 border border-white/10 rounded-lg p-4 overflow-x-auto my-4"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 text-sm">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-white mt-8 mb-4 border-b border-white/10 pb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mb-6">$1</h1>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-400 hover:text-amber-300 underline">$1</a>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="text-white/70 ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-white/70 ml-4">$2</li>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => c.trim().match(/^-+$/))) {
        return ''; // Skip separator rows
      }
      const cellHtml = cells.map(c => `<td class="border border-white/10 px-3 py-2 text-white/70">${c.trim()}</td>`).join('');
      return `<tr>${cellHtml}</tr>`;
    })
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-white/70 mb-4">')
    // Line breaks
    .replace(/\n/g, '<br/>');

  // Wrap in paragraph
  html = `<p class="text-white/70 mb-4">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p class="text-white\/70 mb-4"><\/p>/g, '');
  html = html.replace(/<p class="text-white\/70 mb-4"><br\/><\/p>/g, '');

  // Wrap tables
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table class="w-full border-collapse my-4">$&</table>');

  return html;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;

  const doc = getDocContent(slug);

  if (!doc) {
    notFound();
  }

  const htmlContent = parseMarkdown(doc.content);

  return (
    <main className="min-h-screen bg-[#06000f] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, #06000f 0%, #1a0336 40%, #3b0764 70%, #2a0818 100%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/fi/exec"
            className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1 mb-4"
          >
            ← Back to Executive Summary
          </Link>
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <p className="text-white/40 text-sm mt-1">
            PassionSeed · Founder Institute Documentation
          </p>
        </header>

        {/* Content */}
        <article
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Footer */}
        <footer className="border-t border-white/10 mt-12 pt-6">
          <p className="text-white/30 text-xs text-center">
            PassionSeed · FI Documentation · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </footer>
      </div>
    </main>
  );
}

// ============================================================================
// GENERATE STATIC PARAMS
// ============================================================================

export async function generateStaticParams() {
  const docsDir = path.join(process.cwd(), "docs", "fi");

  function getMdFiles(dir: string, basePath: string[] = []): string[][] {
    const files: string[][] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...getMdFiles(fullPath, [...basePath, entry.name]));
        } else if (entry.name.endsWith(".md")) {
          const slug = entry.name.replace(".md", "");
          files.push([...basePath, slug]);
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return files;
  }

  const slugs = getMdFiles(docsDir);

  return slugs.map((slug) => ({
    slug,
  }));
}
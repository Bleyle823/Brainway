import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowSquareOut,
  Books,
  FileArrowUp,
  WarningCircle,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  listNeurosafeMaterialsFn,
  publishNeurosafeMaterialFn,
  type NeurosafeKind,
  type NeurosafeMaterial,
} from "@/lib/neurosafe-fns";

export const Route = createFileRoute("/community")({
  component: CommunityLibraryPage,
  head: () => ({
    meta: [
      { title: "Community library — Brainwave" },
      {
        name: "description",
        content:
          "Share and browse neurodivergent-safe learning materials: calm pacing, sensory-aware design, and public resources from the community.",
      },
    ],
  }),
});

const KIND_OPTIONS: { value: NeurosafeKind; label: string }[] = [
  { value: "text", label: "Text / notes" },
  { value: "link", label: "Public link" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Image" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function CommunityLibraryPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contributor, setContributor] = useState("");
  const [kind, setKind] = useState<NeurosafeKind>("text");
  const [externalUrl, setExternalUrl] = useState("");
  const [textBody, setTextBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["neurosafe-materials"],
    queryFn: () => listNeurosafeMaterialsFn(),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      let fileBase64: string | undefined;
      let fileName: string | undefined;
      let mimeType: string | undefined;
      if (file) {
        fileBase64 = await fileToBase64(file);
        fileName = file.name;
        mimeType = file.type || "application/octet-stream";
      }
      return publishNeurosafeMaterialFn({
        data: {
          title,
          description,
          contributorDisplay: contributor || undefined,
          kind,
          externalUrl: externalUrl.trim() || undefined,
          textBody: textBody.trim() || undefined,
          fileBase64,
          fileName,
          mimeType,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neurosafe-materials"] });
      setTitle("");
      setDescription("");
      setContributor("");
      setExternalUrl("");
      setTextBody("");
      setFile(null);
      setKind("text");
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      publishMutation.mutate();
    },
    [publishMutation],
  );

  return (
    <div className="min-h-screen bg-neutral-200 pb-24">
      <nav className="w-full px-4 md:px-8 py-4 md:py-5 flex items-center justify-between border-b border-neutral-300 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft weight="fill" className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900" />
            <span className="text-sm text-neutral-900 tracking-tight">Home</span>
          </Link>
          <Link
            to="/transform"
            className="hidden sm:inline text-xs font-normal text-neutral-500 uppercase tracking-[0.15em] hover:text-neutral-900"
          >
            Transform
          </Link>
          <Link
            to="/live"
            className="hidden sm:inline text-xs font-normal text-neutral-500 uppercase tracking-[0.15em] hover:text-neutral-900"
          >
            Live
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-10 pb-8">
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
          <Books className="w-4 h-4" weight="duotone" />
          Public library
        </span>
        <h1 className="mt-4 text-3xl md:text-5xl font-normal text-neutral-900 leading-[1.05] tracking-tight">
          Neurodivergent-safe material
        </h1>
        <p className="mt-4 text-base text-neutral-600 leading-relaxed max-w-2xl">
          Share calm, sensory-aware resources with the community—worksheets, slide notes, PDFs, images, or links to
          public pages you believe are safe for ADHD, autistic, and other neurodivergent learners. Everything listed
          here is visible to all visitors.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-10">
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-5 py-4 text-sm text-amber-950 leading-relaxed">
          <div className="flex gap-2">
            <WarningCircle className="w-5 h-5 shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="font-medium">Before you upload</p>
              <p className="mt-1 text-amber-900/90">
                Only share content you have the right to distribute. Avoid flashing, rapid cuts, loud autoplay, or
                overstimulating imagery. This demo stores submissions in server memory—they may reset when the app
                restarts; for production, connect durable storage (e.g. object storage + database).
              </p>
            </div>
          </div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-neutral-100/90 backdrop-blur-md border border-neutral-200 px-6 py-8 md:px-10 md:py-10"
        >
          <h2 className="text-lg font-medium text-neutral-900 flex items-center gap-2">
            <FileArrowUp className="w-5 h-5" weight="duotone" />
            Add to the public library
          </h2>
          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{formError}</div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cb-title">Title</Label>
                <Input
                  id="cb-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Week 3 calm reading passage"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb-contrib">Your name or org (optional)</Label>
                <Input
                  id="cb-contrib"
                  value={contributor}
                  onChange={(e) => setContributor(e.target.value)}
                  placeholder="Anonymous is fine"
                  maxLength={80}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cb-desc">Short description</Label>
              <Textarea
                id="cb-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is it, who is it for, and why is it sensory-friendly?"
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                className="resize-y min-h-[88px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex flex-wrap gap-2">
                {KIND_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKind(opt.value)}
                    className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
                      kind === opt.value
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cb-url">Public HTTPS link (optional)</Label>
              <Input
                id="cb-url"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cb-text">Text content (optional)</Label>
              <Textarea
                id="cb-text"
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="Paste notes, a script, or a reading here"
                maxLength={8000}
                rows={5}
                className="resize-y font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cb-file">File (optional — PDF or image, max ~1.5 MB)</Label>
              <Input
                id="cb-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,application/pdf,image/*,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="submit"
              disabled={publishMutation.isPending}
              className="rounded-full bg-neutral-900 hover:bg-neutral-800"
            >
              {publishMutation.isPending ? "Publishing…" : "Publish publicly"}
            </Button>
          </form>
        </motion.section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Library</h2>
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-neutral-500">No materials yet.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((m) => (
                <MaterialCard key={m.id} material={m} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function MaterialCard({ material: m }: { material: NeurosafeMaterial }) {
  const dateLabel = new Date(m.createdAt).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white/90 px-5 py-5 md:px-6 md:py-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-medium text-neutral-900">{m.title}</h3>
          <p className="text-xs text-neutral-500 mt-1">
            {m.contributorDisplay} · {dateLabel} · {m.kind}
          </p>
        </div>
        {m.externalUrl && (
          <a
            href={m.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-neutral-900 underline-offset-4 hover:underline"
          >
            Open link
            <ArrowSquareOut className="w-4 h-4" weight="bold" />
          </a>
        )}
      </div>
      <p className="mt-3 text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">{m.description}</p>
      {m.textBody && (
        <pre className="mt-4 text-sm text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
          {m.textBody}
        </pre>
      )}
      {m.fileDataUrl && m.mimeType?.startsWith("image/") && (
        <div className="mt-4 rounded-xl overflow-hidden border border-neutral-200 max-w-md">
          <img src={m.fileDataUrl} alt={m.title} className="w-full h-auto object-contain bg-neutral-100" />
        </div>
      )}
      {m.fileDataUrl && (
        <div className="mt-4">
          <a
            href={m.fileDataUrl}
            download={m.fileName ?? "download"}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
          >
            Download {m.fileName ?? "file"}
          </a>
        </div>
      )}
    </li>
  );
}

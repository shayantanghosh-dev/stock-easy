"use client";

import { useRef, useState } from "react";
import { Eye, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import {
  DOC_ACCEPT_ATTR,
  DOC_MAX_BYTES,
  DOCUMENT_KIND_LABEL,
  fileToBase64,
  formatBytes,
  sniffFileMime,
} from "@/lib/documents";
import { formatDateTime } from "@/lib/format";
import { shopsService } from "@/services/shops.service";
import type { DocumentKind, ShopDocument } from "@/types/models";
import { useDeleteDocument, useShopDocuments, useUploadDocument } from "./hooks";

const KIND_OPTIONS: DocumentKind[] = ["aadhaar", "pan", "license", "gst", "other"];

/**
 * Manage a shop's KYC / verification documents. Self-contained (uses the
 * owner's own document endpoints) so it can drop into both Settings and the
 * approval-pending screen. Bytes are read client-side, validated, and uploaded
 * as base64; viewing fetches through the authenticated client (never a public
 * URL).
 */
export function KycDocuments({ description }: { description?: string }) {
  const { data: docs, isLoading, isError, refetch } = useShopDocuments();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Verification documents
        </CardTitle>
        <CardDescription>
          {description ??
            "Upload Aadhaar, PAN and drug-license proof (PDF, JPG or PNG, up to 5 MB). Only you and platform reviewers can access these files."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UploadRow />
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between rounded-lg border border-error-container bg-error-container/20 p-3 text-on-error-container">
            <span className="font-body-sm text-body-sm">Couldn&apos;t load documents.</span>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <DocumentList docs={docs ?? []} />
        )}
      </CardContent>
    </Card>
  );
}

function UploadRow() {
  const upload = useUploadDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>("aadhaar");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = async (f: File): Promise<boolean> => {
    if (f.size > DOC_MAX_BYTES) {
      setError(`File exceeds the ${formatBytes(DOC_MAX_BYTES)} limit.`);
      return false;
    }
    const sniffed = await sniffFileMime(f);
    if (!sniffed) {
      setError("Unsupported file. Only PDF, JPG and PNG are allowed.");
      return false;
    }
    setError(null);
    return true;
  };

  const onPick = async (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    setFile((await validate(f)) ? f : null);
  };

  const submit = async () => {
    if (!file) return;
    const sniffed = await sniffFileMime(file);
    if (!sniffed) {
      setError("Unsupported file. Only PDF, JPG and PNG are allowed.");
      return;
    }
    try {
      const encoded = await fileToBase64(file);
      await upload.mutateAsync({ kind, fileName: encoded.fileName, mimeType: sniffed, data: encoded.data });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      /* surfaced by the mutation's onError toast */
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low/30 p-4">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="doc-kind">Document type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as DocumentKind)}>
            <SelectTrigger id="doc-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>
                  {DOCUMENT_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doc-file">File</Label>
          <input
            ref={inputRef}
            id="doc-file"
            type="file"
            accept={DOC_ACCEPT_ATTR}
            onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface-variant file:mr-3 file:cursor-pointer file:border-0 file:bg-surface-container-high file:px-3 file:py-2 file:text-label-sm file:text-on-surface"
          />
        </div>
        <Button type="button" onClick={submit} disabled={!file} loading={upload.isPending}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>
      {error ? <p className="mt-2 font-label-sm text-label-sm font-medium text-error">{error}</p> : null}
      {file && !error ? (
        <p className="mt-2 font-label-sm text-[11px] text-on-surface-variant">
          Selected: {file.name} · {formatBytes(file.size)}
        </p>
      ) : null}
    </div>
  );
}

function DocumentList({ docs }: { docs: ShopDocument[] }) {
  if (docs.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant bg-surface-container-low/30 p-4 text-center font-body-sm text-body-sm text-on-surface-variant">
        No documents uploaded yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {docs.map((doc) => (
        <DocumentItem key={doc.id} doc={doc} />
      ))}
    </ul>
  );
}

function DocumentItem({ doc }: { doc: ShopDocument }) {
  const del = useDeleteDocument();
  const [opening, setOpening] = useState(false);

  const view = async () => {
    setOpening(true);
    try {
      const url = await shopsService.downloadDocument(doc.id);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) toast.error("Allow pop-ups to view the document");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("Couldn't open the document");
    } finally {
      setOpening(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-label-md text-label-md text-on-surface">
            {DOCUMENT_KIND_LABEL[doc.kind]}
          </p>
          <p className="truncate font-label-sm text-[11px] text-on-surface-variant">
            {doc.originalName} · {formatBytes(doc.byteSize)} · {formatDateTime(doc.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" size="sm" onClick={view} loading={opening}>
          {opening ? null : <Eye className="h-4 w-4" />}
          View
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-error"
          onClick={() => del.mutate(doc.id)}
          loading={del.isPending && (del.variables as string) === doc.id}
        >
          {del.isPending && (del.variables as string) === doc.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </li>
  );
}

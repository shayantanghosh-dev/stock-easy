"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Lock, RefreshCw, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage } from "@/services/api";
import { useAiQuery } from "./hooks";
import { AiDataPreview } from "./ai-data-preview";
import { AI_TOOL_LABEL, type AiAnswer } from "./types";

interface Turn {
  id: string;
  question: string;
  status: "pending" | "done" | "error";
  answer?: AiAnswer;
  error?: string;
}

const SUGGESTIONS = [
  "What's expiring in the next 30 days?",
  "Which medicines are low on stock?",
  "Show my top-selling medicines",
  "Do I have any dead stock?",
  "How are my sales doing this month?",
];

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AiAssistant() {
  const { user } = useAuth();
  const approved = user?.shop?.status === "approved";
  const aiQuery = useAiQuery();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const ask = async (question: string, existingId?: string) => {
    const trimmed = question.trim();
    if (trimmed.length < 3 || aiQuery.isPending) return;
    const id = existingId ?? newId();
    setTurns((prev) =>
      existingId
        ? prev.map((t) => (t.id === id ? { ...t, status: "pending", error: undefined } : t))
        : [...prev, { id, question: trimmed, status: "pending" }],
    );
    setInput("");
    try {
      const answer = await aiQuery.mutateAsync(trimmed);
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "done", answer } : t)));
    } catch (error) {
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "error", error: errorMessage(error) } : t)),
      );
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      <div className="flex-1 space-y-5 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        {turns.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-headline-md text-on-surface">Pharmacy Copilot</h2>
              <p className="max-w-md font-body-md text-on-surface-variant">
                Ask about your inventory and sales in plain English. The copilot runs safe, read-only reports
                over your shop&apos;s data.
              </p>
            </div>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  disabled={!approved}
                  className="rounded-full border border-outline-variant bg-surface px-3 py-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn) => (
            <div key={turn.id} className="space-y-3">
              {/* User question */}
              <div className="flex justify-end">
                <div className="flex max-w-[80%] items-start gap-2">
                  <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 font-body-sm text-body-sm text-on-primary">
                    {turn.question}
                  </div>
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                    <User className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Assistant answer */}
              <div className="flex justify-start">
                <div className="flex max-w-[88%] items-start gap-2">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-2">
                    {turn.status === "pending" ? (
                      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-surface-container-low px-4 py-2.5 text-on-surface-variant">
                        <Spinner className="h-4 w-4" />
                        <span className="font-body-sm text-body-sm">Analyzing your data…</span>
                      </div>
                    ) : turn.status === "error" ? (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 rounded-2xl rounded-tl-sm border border-error-container bg-error-container/30 px-4 py-2.5 text-on-error-container">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="font-body-sm text-body-sm">{turn.error}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => void ask(turn.question, turn.id)}>
                          <RefreshCw className="h-4 w-4" />
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="rounded-2xl rounded-tl-sm bg-surface-container-low px-4 py-2.5">
                          {turn.answer?.tool ? (
                            <Badge variant="primary" className="mb-2">
                              <Sparkles className="h-3 w-3" />
                              {AI_TOOL_LABEL[turn.answer.tool]}
                            </Badge>
                          ) : null}
                          <p className="whitespace-pre-wrap font-body-md text-on-surface">{turn.answer?.answer}</p>
                        </div>
                        {turn.answer?.data ? <AiDataPreview data={turn.answer.data} /> : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {approved ? (
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder="Ask about expiries, stock, sales…"
            rows={1}
            className="min-h-[44px] resize-none"
            disabled={aiQuery.isPending}
          />
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0" loading={aiQuery.isPending} disabled={input.trim().length < 3}>
            {aiQuery.isPending ? null : <Send className="h-4 w-4" />}
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-warning-container bg-warning-container/40 px-4 py-3 text-on-warning-container">
          <Lock className="h-4 w-4 shrink-0" />
          <p className="font-body-sm text-body-sm">
            The AI assistant is available once your pharmacy is approved.
          </p>
        </div>
      )}
    </div>
  );
}

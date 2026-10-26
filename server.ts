import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PRIMARY_GEMINI_MODEL = "gemini-3.8-flash";
const FALLBACK_GEMINI_MODEL = "gemini-3.1-flash-lite";

interface FeedbackInputPayload {
  id: string;
  text: string;
  category?: string;
  date?: string;
  source?: string;
  reportedImpact?: string;
}

function hasConfiguredApiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(
    apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim().length > 5
  );
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    const err = new Error(
      "GEMINI_API_KEY is not configured on the server. Add a valid key in the AI Studio Settings > Secrets panel (or .env locally), or explore the clearly labeled sample dataset."
    );
    (err as Error & { statusCode?: number; code?: string }).statusCode = 503;
    (err as Error & { statusCode?: number; code?: string }).code = "MISSING_API_KEY";
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatGeminiError(error: unknown): { status: number; message: string; code: string } {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const statusCode =
    (error as { statusCode?: number; status?: number })?.statusCode ||
    (error as { status?: number })?.status;

  if ((error as { code?: string })?.code === "MISSING_API_KEY") {
    return {
      status: 503,
      code: "MISSING_API_KEY",
      message: rawMessage,
    };
  }

  if (
    statusCode === 403 ||
    statusCode === 401 ||
    rawMessage.includes("PERMISSION_DENIED") ||
    rawMessage.includes("API_KEY_INVALID") ||
    rawMessage.includes("API key not valid")
  ) {
    return {
      status: 403,
      code: "INVALID_API_KEY",
      message:
        "Gemini API authentication failed. Verify GEMINI_API_KEY in Settings > Secrets, then retry.",
    };
  }

  if (
    statusCode === 429 ||
    rawMessage.includes("RESOURCE_EXHAUSTED") ||
    rawMessage.includes("quota")
  ) {
    return {
      status: 429,
      code: "RATE_LIMITED",
      message:
        "Gemini API rate limit or quota reached. Wait 30 seconds and click Retry, or inspect sample results.",
    };
  }

  if (statusCode === 404 || rawMessage.includes("NOT_FOUND")) {
    return {
      status: 502,
      code: "MODEL_NOT_FOUND",
      message: `Requested Gemini model was unavailable. Please retry shortly.`,
    };
  }

  return {
    status: 500,
    code: "ANALYSIS_FAILED",
    message: `AI analysis could not be completed: ${rawMessage.slice(0, 260)}`,
  };
}

const opportunityItemSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Concise, plain-language title for this recurring issue cluster.",
    },
    problemDescription: {
      type: Type.STRING,
      description: "Clear summary of the issue grounded strictly in supplied feedback.",
    },
    category: {
      type: Type.STRING,
      description:
        "Primary category (e.g., Water Supply, Electricity & Lighting, Roads & Footpaths, Sanitation, Waste Collection, Public Facilities, Accessibility, Transport, Education & Classroom, Wi-Fi & IT, Dining & Canteen, Student Services).",
    },
    affectedUsers: {
      type: Type.STRING,
      description:
        "Who is affected according to the reports, or 'Not explicitly specified in reports' if unknown.",
    },
    reportedConsequences: {
      type: Type.STRING,
      description: "Concrete consequences reported by submitters.",
    },
    relatedFeedbackIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exact IDs of feedback entries supporting this issue.",
    },
    contradictoryFeedbackIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Exact IDs of feedback entries expressing opposing experiences or scope caveats. Empty array if none.",
    },
    evidenceExcerpts: {
      type: Type.ARRAY,
      description: "1 to 4 short verbatim substrings copied directly from the supplied feedback entries.",
      items: {
        type: Type.OBJECT,
        properties: {
          feedbackId: { type: Type.STRING },
          excerpt: { type: Type.STRING },
          isContradictory: { type: Type.BOOLEAN },
        },
        required: ["feedbackId", "excerpt", "isContradictory"],
      },
    },
    reportedImpactLevel: {
      type: Type.STRING,
      description: "Must be one of: Low, Medium, High, Unknown.",
    },
    urgencyLevel: {
      type: Type.STRING,
      description: "Must be one of: Low, Medium, High, Critical, Unknown.",
    },
    aiConfidenceNote: {
      type: Type.STRING,
      description: "1-2 sentence assessment of evidence consistency or gaps.",
    },
    informationGaps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    suggestedSuccessMetrics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    requiresFurtherInvestigation: {
      type: Type.BOOLEAN,
    },
    interventions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          problemAddressed: { type: Type.STRING },
          effort: { type: Type.STRING },
          potentialImpact: { type: Type.STRING },
          dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
          responsibleRole: { type: Type.STRING },
          implementationSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          expectedOutcome: { type: Type.STRING },
          successMetric: { type: Type.STRING },
          infoRequiredBeforeImpl: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          "title",
          "problemAddressed",
          "effort",
          "potentialImpact",
          "dependencies",
          "responsibleRole",
          "implementationSteps",
          "expectedOutcome",
          "successMetric",
          "infoRequiredBeforeImpl",
        ],
      },
    },
  },
  required: [
    "title",
    "problemDescription",
    "category",
    "affectedUsers",
    "reportedConsequences",
    "relatedFeedbackIds",
    "contradictoryFeedbackIds",
    "evidenceExcerpts",
    "reportedImpactLevel",
    "urgencyLevel",
    "aiConfidenceNote",
    "informationGaps",
    "suggestedSuccessMetrics",
    "requiresFurtherInvestigation",
    "interventions",
  ],
};

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summaryNarrative: {
      type: Type.STRING,
    },
    opportunities: {
      type: Type.ARRAY,
      items: opportunityItemSchema,
    },
  },
  required: ["summaryNarrative", "opportunities"],
};

async function generateStructuredJson(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction: string
): Promise<{ text: string; modelUsed: string }> {
  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.15,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
      },
    });
    if (response.text && response.text.trim()) {
      return { text: response.text, modelUsed: PRIMARY_GEMINI_MODEL };
    }
  } catch (primaryErr) {
    const code = (primaryErr as { status?: number })?.status;
    // Only fall back on model-not-found or transient 5xx; immediately rethrow auth/quota errors
    if (code === 401 || code === 403 || code === 429) {
      throw primaryErr;
    }
    const fallbackResponse = await ai.models.generateContent({
      model: FALLBACK_GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.15,
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
      },
    });
    if (fallbackResponse.text && fallbackResponse.text.trim()) {
      return { text: fallbackResponse.text, modelUsed: FALLBACK_GEMINI_MODEL };
    }
    throw primaryErr;
  }

  throw new Error("Gemini returned an empty response body.");
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "6mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    const hasKey = hasConfiguredApiKey();
    res.json({
      ok: true,
      model: PRIMARY_GEMINI_MODEL,
      fallbackModel: FALLBACK_GEMINI_MODEL,
      hasApiKey: hasKey,
      status: hasKey ? "ready" : "missing_api_key",
    });
  });

  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const items: FeedbackInputPayload[] = Array.isArray(req.body?.feedback)
        ? req.body.feedback
        : [];
      const workspaceName =
        typeof req.body?.workspaceName === "string"
          ? req.body.workspaceName
          : "Community Workspace";
      const targetLanguage =
        typeof req.body?.targetLanguage === "string" ? req.body.targetLanguage : "en";

      if (items.length === 0) {
        res.status(400).json({
          error: "No feedback entries were provided for analysis.",
          code: "EMPTY_INPUT",
        });
        return;
      }

      if (items.length > 60) {
        res.status(400).json({
          error: "Batch size exceeds 60 entries. Send feedback in batches of up to 40 entries.",
          code: "BATCH_TOO_LARGE",
        });
        return;
      }

      const ai = getGenAIClient();

      const formattedFeedback = items
        .map((item) => {
          const metaParts = [
            item.category ? `Category: ${item.category}` : null,
            item.date ? `Date: ${item.date}` : null,
            item.source ? `Source: ${item.source}` : null,
            item.reportedImpact && item.reportedImpact !== "Unknown"
              ? `Reported Impact: ${item.reportedImpact}`
              : null,
          ]
            .filter(Boolean)
            .join(" | ");
          return `[ID: ${item.id}] (${metaParts || "No metadata"})\n"${item.text.trim()}"`;
        })
        .join("\n\n");

      const languageInstruction =
        targetLanguage && targetLanguage !== "en"
          ? `\n10. Provide output titles, problemDescription, summaryNarrative, and candidate interventions translated in language code "${targetLanguage}" while preserving exact [ID: ...] tags and verbatim evidence excerpts unchanged.`
          : "";

      const systemInstruction = `You are the evidence-grounded analytical engine for NEEDMAP AI analyzing feedback for "${workspaceName}".
STRICT RULES:
1. Group semantically similar complaints and recurring community needs into clear clusters, even when phrased differently.
2. Distinguish separate problems that happen to share surface words (e.g., "Canteen lunch queue wait times" and "Canteen missing peanut allergen labels" MUST be two separate clusters).
3. Keep isolated high-severity or uncertain reports as separate clusters with requiresFurtherInvestigation = true.
4. NEVER invent feedback IDs, quotes, or claims. Every feedbackId MUST match an exact [ID: ...] provided in the input.
5. Every evidenceExcerpt.excerpt MUST be a verbatim substring copied from that feedback entry's text.
6. List contradictory or scope-refining entries in contradictoryFeedbackIds and mark their excerpt isContradictory = true.
7. Set reportedImpactLevel strictly to: "Low", "Medium", "High", or "Unknown".
8. Set urgencyLevel strictly to: "Low", "Medium", "High", "Critical", or "Unknown".
9. Suggest 1 to 2 practical candidate interventions per cluster with effort/potentialImpact in ["Low", "Medium", "High"].${languageInstruction}`;

      const { text: rawText, modelUsed } = await generateStructuredJson(
        ai,
        `Analyze these ${items.length} feedback entries and return structured JSON clusters grounded strictly in the provided text:\n\n${formattedFeedback}`,
        systemInstruction
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          error: "Gemini returned malformed JSON that could not be parsed. Please retry.",
          code: "MALFORMED_JSON",
        });
        return;
      }

      res.json({
        model: modelUsed,
        analyzedAt: new Date().toISOString(),
        data: parsed,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({
        error: formatted.message,
        code: formatted.code,
      });
    }
  });

  app.post("/api/consolidate", async (req: Request, res: Response) => {
    try {
      const clusters = Array.isArray(req.body?.opportunities) ? req.body.opportunities : [];
      const workspaceName =
        typeof req.body?.workspaceName === "string"
          ? req.body.workspaceName
          : "Community Workspace";

      if (clusters.length === 0) {
        res.status(400).json({
          error: "No batch clusters provided for consolidation.",
          code: "EMPTY_CLUSTERS",
        });
        return;
      }

      const ai = getGenAIClient();

      const systemInstruction = `Consolidate multi-batch NEEDMAP AI opportunity clusters for "${workspaceName}".
Merge ONLY clusters describing the exact same underlying problem while preserving ALL relatedFeedbackIds, contradictoryFeedbackIds, and verbatim evidenceExcerpts without inventing any IDs or quotes.`;

      const { text: rawText, modelUsed } = await generateStructuredJson(
        ai,
        `Consolidate overlapping clusters across batches:\n\n${JSON.stringify(clusters, null, 2)}`,
        systemInstruction
      );

      const parsed = JSON.parse(rawText);
      res.json({
        model: modelUsed,
        analyzedAt: new Date().toISOString(),
        data: parsed,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({
        error: formatted.message,
        code: formatted.code,
      });
    }
  });

  app.post("/api/assistant", async (req: Request, res: Response) => {
    try {
      const userMessage = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!userMessage) {
        res.status(400).json({ error: "Message is required.", code: "EMPTY_MESSAGE" });
        return;
      }

      const role = typeof req.body?.role === "string" ? req.body.role : "citizen";
      const language = typeof req.body?.language === "string" ? req.body.language : "en";
      const context = req.body?.context || {};
      const conversationHistory = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

      const ai = getGenAIClient();

      const systemInstruction = `You are the official NEEDMAP AI Assistant for the civic and campus issue resolution platform.
User Role: ${role}.
Target Language Code: ${language}.

GROUNDING CONTEXT (Authorized records available to this user):
${JSON.stringify(context, null, 2)}

STRICT OPERATIONAL RULES:
1. Answer questions clearly, practically, and calmly. Explain technical and administrative terms in short sentences.
2. Ground all answers strictly in the supplied authorized context. NEVER fabricate complaint IDs, statuses, departments, or job vacancies. If an issue is not in the context, state clearly that it was not found in their accessible records.
3. Treat suggestions as recommendations, not official administrative decisions.
4. Do NOT use emojis, em dashes, or checkmark bullets in your output.
5. Provide response in language code "${language}" when possible, keeping specific identifiers (like CMP-XXXX, DEP-XXX) intact.
6. Provide actionable guidance:
   - For citizen inquiries: explain how to report a problem, current complaint statuses (such as why a case is 'resolved_awaiting_confirmation' and requires citizen satisfaction rating to close), or how to apply for vacancies.
   - For workers: summarize assigned tasks, offer practical field checklists for resolution, and outline how to submit resolution notes.
   - For administrators: explain department queues, priority breakdowns, SLA timelines, and intervention planning.`;

      let prompt = "";
      if (conversationHistory.length > 0) {
        prompt += "Previous conversation:\n";
        for (const item of conversationHistory) {
          prompt += `${item.role === "user" ? "User" : "Assistant"}: ${item.text}\n`;
        }
        prompt += "\n";
      }
      prompt += `User Query: ${userMessage}`;

      let reply = "";
      let modelUsed = PRIMARY_GEMINI_MODEL;

      const withTimeout = <T>(p: Promise<T>, ms = 5000): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error("GATEWAY_TIMEOUT")), ms)),
        ]);

      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: PRIMARY_GEMINI_MODEL,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          }),
          5000
        );
        reply = response.text || "";
      } catch (primaryErr) {
        // Fall back to faster/higher-availability model
        try {
          const fallbackRes = await withTimeout(
            ai.models.generateContent({
              model: FALLBACK_GEMINI_MODEL,
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.3,
              },
            }),
            5000
          );
          reply = fallbackRes.text || "";
          modelUsed = FALLBACK_GEMINI_MODEL;
        } catch (secondaryErr) {
          // If Gemini models are experiencing temporary high demand or timeout, provide grounded response
          if (userMessage.toLowerCase().includes("report")) {
            reply = "To submit a new complaint, click the 'Report a Problem' button at the top of the dashboard. Select the issue category, describe the problem, specify the location or pin coordinates, attach any photos, and click 'Submit Complaint'. It will be immediately routed to the responsible department.";
          } else if (userMessage.toLowerCase().includes("status") || userMessage.toLowerCase().includes("track")) {
            reply = "You can track submitted complaints under 'My Complaints'. Typical statuses are: 'submitted' (logged), 'assigned' (allocated to department/worker), 'in_progress' (repairs underway), and 'resolved_awaiting_confirmation' (work completed and waiting for your verification).";
          } else if (userMessage.toLowerCase().includes("job") || userMessage.toLowerCase().includes("vacancy")) {
            reply = "You can view available employment and fellowship listings under the 'Jobs & Fellowships' portal in the sidebar. You can apply directly with your contact information and experience.";
          } else {
            reply = "The assistant is ready to help you navigate complaint tracking, department routing, resolution verification, and job openings. How can I assist you with your current case?";
          }
          modelUsed = "grounded-rules-engine";
        }
      }

      res.json({
        reply: reply || "I am currently unable to generate a response. Please try again shortly.",
        model: modelUsed,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({
        error: formatted.message,
        code: formatted.code,
      });
    }
  });

  const distPath = path.resolve(__dirname, "dist");
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`NEEDMAP AI server listening on http://0.0.0.0:${PORT}`);
  });
  server.requestTimeout = 120000;
}

startServer().catch((err) => {
  console.error("Failed to start NEEDMAP AI server:", err);
  process.exit(1);
});

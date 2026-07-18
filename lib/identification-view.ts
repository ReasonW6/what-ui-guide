import type { BilingualText, CodeBundle, PlatformId } from "./catalog";

export type AnalysisBasis = "screenshot" | "browser_snapshot" | "public_web";
export type AnalysisConfidence = "high" | "medium" | "low";
export type AnalysisStatus = "identified" | "ambiguous" | "unknown";

export interface AnalysisCandidate {
  readonly slug: string;
  readonly confidence: AnalysisConfidence;
  readonly evidence: readonly string[];
  readonly distinction: string;
  readonly implementation: ContextualImplementation;
  readonly name: BilingualText;
  readonly summary: BilingualText;
  readonly aliases: readonly string[];
  readonly platforms: readonly PlatformId[];
  readonly anatomy: readonly string[];
  readonly useWhen: readonly string[];
  readonly avoidWhen: readonly string[];
  readonly accessibility: readonly string[];
  readonly aiPrompt: string;
  readonly confusionGuide: string | null;
  readonly code: CodeBundle;
}

export interface ContextualImplementation {
  readonly anatomy: readonly string[];
  readonly behavior: readonly string[];
  readonly styling: readonly string[];
  readonly accessibility: readonly string[];
}

export interface AnalysisSource {
  readonly title: string | null;
  readonly url: string;
}

export interface IdentificationResponse {
  readonly status: AnalysisStatus;
  readonly summary: string;
  readonly basis: AnalysisBasis;
  readonly candidates: readonly AnalysisCandidate[];
  readonly uncertainties: readonly string[];
  readonly followUpQuestion: string | null;
  readonly notices: readonly string[];
  readonly sourceUrl: string | null;
  readonly sourcePreview: string | null;
  readonly sources: readonly AnalysisSource[];
}

export interface IdentificationCapabilities {
  readonly managedAi: boolean;
  readonly visualWebpageCapture: boolean;
  readonly maxImageBytes: number;
  readonly acceptedImageTypes: readonly string[];
}

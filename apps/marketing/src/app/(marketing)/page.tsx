import { AuroraBackground }  from "@/components/ui/AuroraBackground";
import { Hero }              from "@/components/marketing/Hero";
import { TrustBar }          from "@/components/marketing/TrustBar";
import { ProblemSolution }   from "@/components/marketing/ProblemSolution";
import { HowItWorks }        from "@/components/marketing/HowItWorks";
import { UserSegments }      from "@/components/marketing/UserSegments";
import { ReviewPreview }     from "@/components/marketing/ReviewPreview";
import { ExportPreview }     from "@/components/marketing/ExportPreview";
import { FeatureGrid }       from "@/components/marketing/FeatureGrid";
import { FAQSection }        from "@/components/marketing/FAQSection";
import { CTABanner }         from "@/components/marketing/CTABanner";
import { faqs }              from "@/content/faqs";

export default function HomePage() {
  return (
    <>
      <AuroraBackground intensity="strong" />
      <Hero />
      <TrustBar />
      <ProblemSolution />
      <HowItWorks />
      <UserSegments />
      <ReviewPreview />
      <ExportPreview />
      <FeatureGrid />
      <FAQSection items={faqs.slice(0, 5)} heading="Common questions" />
      <CTABanner />
    </>
  );
}

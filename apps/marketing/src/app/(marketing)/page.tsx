import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { TrustBar } from "@/components/marketing/TrustBar";
import { CTABanner } from "@/components/marketing/CTABanner";

export default function HomePage() {
  return (
    <>
      <AuroraBackground intensity="strong" />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <FeatureGrid />
      <CTABanner />
    </>
  );
}

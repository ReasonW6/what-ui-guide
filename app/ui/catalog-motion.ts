"use client";

import { useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function CatalogMotion({ scope, signature }: { scope: RefObject<HTMLElement | null>; signature: string }) {
  const seen = useRef(new Set<string>());
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.timeline({ defaults: { duration: 0.65, ease: "power3.out", clearProps: "transform,opacity" } })
        .from(".hero-heading > div, .catalog-edition", { y: 18, opacity: 0, stagger: 0.08 })
        .from(".search-panel", { y: 12, opacity: 0 }, "<0.12");
    }, scope);
    return () => media.revert();
  }, { scope });

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", (context) => {
      const animate = context.add("reveal", (targets: HTMLElement[]) => {
        gsap.from(targets, { y: 20, opacity: 0, duration: 0.5, stagger: 0.045, ease: "power2.out", clearProps: "transform,opacity" });
      });
      const observer = new IntersectionObserver((entries) => {
        const targets = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);
        if (!targets.length) return;
        targets.forEach((target) => {
          seen.current.add(target.dataset.cardSlug ?? "");
          observer.unobserve(target);
        });
        animate(targets);
      }, { threshold: 0.08 });
      scope.current?.querySelectorAll<HTMLElement>(".component-card").forEach((card) => {
        if (!seen.current.has(card.dataset.cardSlug ?? "")) observer.observe(card);
      });
      return () => observer.disconnect();
    }, scope);
    return () => media.revert();
  }, { scope, dependencies: [signature], revertOnUpdate: true });
  return null;
}

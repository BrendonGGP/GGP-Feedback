"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { ReactNode } from "react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

export function DashboardMotion({ children }: Readonly<{ children: ReactNode }>) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = gsap.utils.toArray<HTMLElement>(
          "[data-dashboard-reveal]",
        );

        gsap.fromTo(
          targets,
          { autoAlpha: 0, y: 14, willChange: "transform,opacity" },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.36,
            stagger: 0.045,
            ease: "power2.out",
            clearProps: "transform,opacity,visibility,willChange",
          },
        );
      });

      return () => media.revert();
    },
    { scope: scopeRef },
  );

  return <div ref={scopeRef}>{children}</div>;
}

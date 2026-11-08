"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/card";

// maplibre-gl needs `window`; load it in the browser only.
export const OverviewMap = dynamic(() => import("./overview-map"), { ssr: false, loading: () => <Skeleton className="h-80 w-full" /> });
export type { OverviewMarker, DemandDot, MapLink, MapArea } from "./overview-map";

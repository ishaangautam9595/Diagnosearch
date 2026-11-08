"use client";
import { useMemo } from "react";
import { Info, MapPin, Route } from "lucide-react";
import { OverviewMap } from "@/components/map/overview-map-lazy";

interface Branch { id: string; name: string; lat: number; lng: number; km: number; nearest: boolean }

/**
 * Shows how far the patient is from the lab's branches. Until the patient accepts the lab's offer only an approximate
 * area (~1 km) is shown; the winning lab gets the exact pin.
 */
export function PatientDistanceMap({ location, branches, patientLabel }: {
  location: { lat: number; lng: number; exact: boolean };
  branches: Branch[];
  patientLabel: string;
}) {
  const nearest = branches.find((b) => b.nearest) ?? null;
  const markers = useMemo(
    () => [
      { lat: location.lat, lng: location.lng, label: patientLabel, sub: location.exact ? "Exact location" : "Approximate area (~1 km)", kind: "home" as const },
      ...branches.map((b) => ({ lat: b.lat, lng: b.lng, label: b.name, sub: `${b.km} km from the patient${b.nearest ? " · nearest branch" : ""}`, kind: "branch" as const })),
    ],
    [location.lat, location.lng, location.exact, branches, patientLabel],
  );
  const links = useMemo(() => (nearest ? [{ from: { lat: location.lat, lng: location.lng }, to: { lat: nearest.lat, lng: nearest.lng }, label: `${nearest.km} km` }] : []), [nearest, location.lat, location.lng]);
  const areas = useMemo(() => (location.exact ? [] : [{ lat: location.lat, lng: location.lng, km: 0.75 }]), [location.exact, location.lat, location.lng]);

  if (!branches.length) return <p className="rounded-xl bg-mint-soft p-4 text-sm text-muted">Add a pinned branch address to see distances on a map.</p>;
  return (
    <div data-testid="patient-distance-map">
      {nearest ? (
        <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-primary-dark"><Route className="size-4" /> <span data-testid="distance-text">{nearest.km} km</span> straight-line from {nearest.name}</span>
          {branches.length > 1 ? <span className="text-muted">{branches.length} branches shown</span> : null}
        </p>
      ) : null}
      <OverviewMap center={{ lat: location.lat, lng: location.lng }} markers={markers} links={links} areas={areas} height={300} />
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
        {location.exact ? <><MapPin className="mt-0.5 size-3.5 shrink-0" /> Exact pin — the patient accepted your offer.</> : <><Info className="mt-0.5 size-3.5 shrink-0" /> Approximate area (~1 km). The exact pin is shared only if the patient accepts your offer.</>}
      </p>
    </div>
  );
}

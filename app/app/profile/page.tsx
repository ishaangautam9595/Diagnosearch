import type { Metadata } from "next";
import { requirePatientPage } from "@/lib/auth";
import { getDefaultMapCenter } from "@/lib/services/map-defaults";
import { ChangePasswordCard } from "@/components/dashboard/change-password-form";
import { ProfileForm } from "@/components/patient/profile-form";
import { Coins } from "lucide-react";
import { getLoyalty } from "@/lib/services/loyalty";
import { formatDate } from "@/lib/utils";
import { Card, PageHeading } from "@/components/ui/card";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const me = await requirePatientPage();
  const center = me.latitude != null && me.longitude != null ? { lat: me.latitude, lng: me.longitude, zoom: 15 } : await getDefaultMapCenter();
  const loyalty = await getLoyalty(me.id);
  return (
    <>
      <PageHeading title="Profile" subtitle={`Signed in with ${me.email ?? me.phone}`} />
      <Card className="mb-6 max-w-2xl space-y-3 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Coins className="size-6" /></span>
          <div><p className="text-xs text-muted">Loyalty coins</p><p className="tabular text-2xl font-bold" data-testid="coin-balance">{loyalty.balance}</p></div>
        </div>
        <p className="text-xs text-muted">Earn 1 coin for every ₹10 of a booking once the lab marks it completed.</p>
        {loyalty.history.length ? (
          <ul className="divide-y divide-border text-sm">
            {loyalty.history.map((t) => <li key={t.id} className="flex justify-between gap-3 py-2"><span>{t.reason}<span className="block text-xs text-muted">{formatDate(t.createdAt)}</span></span><span className="font-semibold text-primary-dark">+{t.coins}</span></li>)}
          </ul>
        ) : null}
      </Card>
      <Card className="max-w-2xl p-5 sm:p-6">
        <ProfileForm name={me.name} center={center} initial={{ addressLine: me.addressLine ?? "", city: me.city ?? "", pincode: me.pincode ?? "", latitude: me.latitude, longitude: me.longitude }} />
      </Card>
      <div className="mt-6"><ChangePasswordCard /></div>
    </>
  );
}

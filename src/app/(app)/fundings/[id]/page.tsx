import { notFound } from "next/navigation";
import { requireRolesPage } from "@/lib/auth/guard";
import { getFundingDetail } from "@/lib/services/fundings";
import { listInvestors } from "@/lib/services/investors";
import { FundingDetailClient } from "@/components/app/funding-detail-client";

export const dynamic = "force-dynamic";

/**
 * Detail Funding: kontribusi investor, aturan bagi hasil, pengembalian pokok,
 * dan daftar proyek yang dibiayai. Khusus admin/operator.
 */
export default async function FundingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRolesPage(["admin", "operator"]);
  const { id } = await params;

  let detail;
  try {
    detail = await getFundingDetail(id);
  } catch {
    notFound();
  }

  const investors = await listInvestors();

  return <FundingDetailClient detail={detail} investors={investors} />;
}

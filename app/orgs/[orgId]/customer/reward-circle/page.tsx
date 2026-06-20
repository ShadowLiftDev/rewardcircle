import RewardCircleWalletClient from "./RewardCircleWalletClient";

type PageProps = {
  params:
    | {
        orgId?: string;
      }
    | Promise<{
        orgId?: string;
      }>;
};

export default async function RewardCircleCustomerWalletPage({
  params,
}: PageProps) {
  const resolvedParams = await params;
  const orgId = String(resolvedParams?.orgId ?? "").trim();

  return <RewardCircleWalletClient orgId={orgId} />;
}
import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Admin Login – RewardCircle",
  description:
    "Sign in to manage RewardCircle rewards, members, points, tiers, and redemptions.",
};

export default function LoginPage() {
  return <LoginClient />;
}
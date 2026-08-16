import type { Metadata } from "next";
import UsersView from "@/components/UsersView";

export const metadata: Metadata = {
  title: "ข้อมูลผู้ใช้ | กินไรดี?",
  robots: { index: false, follow: false },
};

export default function UsersPage() {
  return <UsersView />;
}

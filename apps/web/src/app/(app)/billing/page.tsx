import { redirect } from "next/navigation";

/** "Billing" is split into Point of Sale (/pos) and Bills history (/bills). */
export default function BillingPage() {
  redirect("/bills");
}

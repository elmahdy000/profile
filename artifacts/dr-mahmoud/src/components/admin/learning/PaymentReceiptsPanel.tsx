import React from "react";
import { PaymentsTab, type PaymentReceipt } from "./PaymentsTab";

export type { PaymentReceipt };

export function PaymentReceiptsPanel(props: { receipts?: PaymentReceipt[]; onRefresh?: () => void }) {
  return <PaymentsTab {...props} role="superadmin" />;
}

export type Member = {
  id: number;
  name?: string;
};

export type GroupResponse = {
  id: number;
  name?: string;
  members: Member[];
};

export type Split = {
  userId: number;
  shareAmount: string;
};

export type Expense = {
  expenseId: number;
  groupId: number;
  description: string;
  amount: string;
  payerUserId: number;
  createdAt?: string;
  splits?: Split[];
};

export type SettlementTransfer = {
  fromUserId: number;
  toUserId: number;
  amount: string;
};

export type LedgerEntry = {
  userId: number;
  netBalance: string;
};

export type LedgerExplanationTransfer = {
  transferId?: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  createdAt?: string;
};

export type LedgerExplanationExpense = {
  expenseId?: number;
  description?: string;
  amount?: string;
  payerUserId?: number;
  createdAt?: string;
  splits?: Split[];
};

export type LedgerContribution = {
  type?: string;
  amount?: string;
  description?: string;
  timestamp?: string;
  referenceId?: number;
};

export type LedgerExplanationEntry = {
  userId: number;
  netBalance?: string;
  expenses?: LedgerExplanationExpense[];
  contributingExpenses?: LedgerExplanationExpense[];
  transfers?: LedgerExplanationTransfer[];
  contributingTransfers?: LedgerExplanationTransfer[];
  transfersIn?: LedgerExplanationTransfer[];
  transfersOut?: LedgerExplanationTransfer[];
  contributions?: LedgerContribution[];
};

export type LedgerExplanationResponse = {
  entries?: LedgerExplanationEntry[];
  users?: LedgerExplanationEntry[];
  items?: LedgerExplanationEntry[];
  explanations?: LedgerExplanationEntry[];
  data?: LedgerExplanationResponse | LedgerExplanationEntry[];
  result?: LedgerExplanationResponse | LedgerExplanationEntry[];
  payload?: LedgerExplanationResponse | LedgerExplanationEntry[];
  [key: string]: unknown;
};

export type EventResponse = {
  eventId: number;
  groupId: number;
  expenseId?: number;
  eventType: string;
  payload: string;
  createdAt: string;
};

export type ConfirmedTransfer = {
  id: number;
  groupId: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  confirmationId?: string;
  createdAt: string;
};

export type GroupTab = "members" | "expenses" | "settle" | "explain" | "history";

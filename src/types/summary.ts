/** カテゴリ別・支出のみ */
export type CategoryExpenseTotal = {
  categoryId: string | null;
  categoryName: string;
  total: number;
};

/** 対象月の集計（transactions の実レコードのみ） */
export type MonthlySummary = {
  yearMonth: string;
  expenseTotal: number;
  incomeTotal: number;
  balance: number;
  categoryExpenses: CategoryExpenseTotal[];
};

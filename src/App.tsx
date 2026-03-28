import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "./components/AuthLayout";
import { HouseholdRequiredLayout } from "./components/HouseholdRequiredLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { HouseholdProvider } from "./contexts/HouseholdContext";
import { HomePage } from "./pages/HomePage";
import { HouseholdCreatePage } from "./pages/HouseholdCreatePage";
import { HouseholdJoinPage } from "./pages/HouseholdJoinPage";
import { HouseholdSetupPage } from "./pages/HouseholdSetupPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { CategoryEditPage } from "./pages/CategoryEditPage";
import { CategoryNewPage } from "./pages/CategoryNewPage";
import { MonthlySummaryPage } from "./pages/MonthlySummaryPage";
import { QrScanPage } from "./pages/QrScanPage";
import { TransactionEditPage } from "./pages/TransactionEditPage";
import { TransactionNewPage } from "./pages/TransactionNewPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HouseholdProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route element={<AuthLayout />}>
              <Route path="/household/setup" element={<HouseholdSetupPage />} />
              <Route path="/household/create" element={<HouseholdCreatePage />} />
              <Route path="/household/join" element={<HouseholdJoinPage />} />

              <Route element={<HouseholdRequiredLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/transactions/new" element={<TransactionNewPage />} />
                <Route path="/transactions/:transactionId/edit" element={<TransactionEditPage />} />
                <Route path="/scan" element={<QrScanPage />} />
                <Route path="/summary/month" element={<MonthlySummaryPage />} />
                <Route path="/categories/new" element={<CategoryNewPage />} />
                <Route path="/categories/:categoryId/edit" element={<CategoryEditPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HouseholdProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

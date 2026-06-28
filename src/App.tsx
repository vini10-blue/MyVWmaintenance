import { Routes, Route } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { SyncManager } from "./components/SyncManager";
import { Garage } from "./routes/Garage";
import { CarEditor } from "./routes/CarEditor";
import { CarDetail } from "./routes/CarDetail";
import { ServiceSuggestions } from "./routes/ServiceSuggestions";
import { RecordEditor } from "./routes/RecordEditor";
import { History } from "./routes/History";
import { FuelLogPage } from "./routes/FuelLog";
import { Reminders } from "./routes/Reminders";
import { Reports } from "./routes/Reports";
import { SignIn } from "./routes/SignIn";
import { UpdatePassword } from "./routes/UpdatePassword";
import { Account } from "./routes/Account";

export default function App() {
  const { loading, cloudEnabled, user, recovering } = useAuth();

  if (loading) {
    return (
      <div className="app">
        <main className="app__main">
          <p className="muted" style={{ textAlign: "center", marginTop: 40 }}>
            Loading…
          </p>
        </main>
      </div>
    );
  }

  // Following a password-reset link: let the user set a new password before
  // they reach the app (even though the recovery session makes them "signed in").
  if (cloudEnabled && recovering) {
    return <UpdatePassword />;
  }

  // When a cloud backend is configured, require sign-in so data is backed up.
  if (cloudEnabled && !user) {
    return <SignIn />;
  }

  return (
    <>
      <SyncManager />
      <Routes>
        <Route path="/" element={<Garage />} />
        <Route path="/account" element={<Account />} />
        <Route path="/car/new" element={<CarEditor />} />
        <Route path="/car/:id" element={<CarDetail />} />
        <Route path="/car/:id/edit" element={<CarEditor />} />
        <Route path="/car/:id/suggestions" element={<ServiceSuggestions />} />
        <Route path="/car/:id/history" element={<History />} />
        <Route path="/car/:id/fuel" element={<FuelLogPage />} />
        <Route path="/car/:id/record/new" element={<RecordEditor />} />
        <Route path="/car/:id/record/:recordId" element={<RecordEditor />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </>
  );
}

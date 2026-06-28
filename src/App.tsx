import { Routes, Route } from "react-router-dom";
import { Garage } from "./routes/Garage";
import { CarEditor } from "./routes/CarEditor";
import { CarDetail } from "./routes/CarDetail";
import { ServiceSuggestions } from "./routes/ServiceSuggestions";
import { RecordEditor } from "./routes/RecordEditor";
import { History } from "./routes/History";
import { FuelLogPage } from "./routes/FuelLog";
import { Reminders } from "./routes/Reminders";
import { Reports } from "./routes/Reports";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Garage />} />
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
  );
}

import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "./components/app-layout";

import Dashboard from "./pages/dashboard";
import InsightDetail from "./pages/insight-detail";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/insights/:configId" element={<InsightDetail />} />
        </Route>
      </Routes>
      <Toaster />
    </HashRouter>
  );
}

export default App;

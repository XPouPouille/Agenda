import { NavLink, Route, Routes } from "react-router-dom";
import { ThemeToggle } from "./components/ThemeToggle";
import { AgendaPage } from "./pages/AgendaPage";
import { ResultsPage } from "./pages/ResultsPage";

export default function App() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>🏁 Agenda Compétitions</h1>
        <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <NavLink to="/" end>
            Agenda
          </NavLink>
          <NavLink to="/resultats">Résultats</NavLink>
          <ThemeToggle />
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<AgendaPage />} />
        <Route path="/resultats" element={<ResultsPage />} />
      </Routes>
    </div>
  );
}

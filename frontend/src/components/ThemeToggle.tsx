import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="btn secondary" onClick={toggleTheme}>
      {theme === "light" ? "🌙 Sombre" : "☀️ Clair"}
    </button>
  );
}

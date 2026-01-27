import React, { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { linter, lintGutter } from "@codemirror/lint";
import "./App.css";
import { parseSonarQubeReport, mapDiagnosticsToContent } from "./utils/education";

export default function App() {
  const [value, setValue] = useState(`// Test JavaScript\nconsole.log("Hello!");`);
  const [lang, setLang] = useState("javascript");
  const [output, setOutput] = useState("");
  const [eduContent, setEduContent] = useState([]);
  const [sonarResults, setSonarResults] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Énoncés des exercices
  const exercises = {
    javascript: {
      title: "Exercice JavaScript",
      description: `Écrivez un programme qui:\n1. Affiche "Hello, World!"\n2. Calcule la somme de 1 à 10\n3. Affiche le résultat`
    },
    python: {
      title: "Exercice Python",
      description: `Écrivez un programme qui:\n1. Affiche "Hello, World!"\n2. Calcule la somme de 1 à 10\n3. Affiche le résultat`
    }
  };

  // Python Linter
  const pythonLinter = linter((view) => {
    const code = view.state.doc.toString();
    const diagnostics = [];
    const lines = code.split('\n');

    if (code.includes("print(") && !code.includes(")")) {
      diagnostics.push({
        from: code.indexOf("print("),
        to: code.indexOf("print(") + 6,
        severity: "error",
        message: "Erreur de syntaxe : parenthèse fermante manquante.",
      });
    }

    lines.forEach((line, index) => {
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;

      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        const from = code.split('\n').slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
        diagnostics.push({
          from: from,
          to: from + line.length,
          severity: "error",
          message: "Guillemets non fermés",
        });
      }
    });

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (/^(if|for|while|def|class)\s+.+[^:]$/.test(trimmed)) {
        const from = code.split('\n').slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
        diagnostics.push({
          from: from,
          to: from + line.length,
          severity: "error",
          message: "':' manquant à la fin de la ligne",
        });
      }
    });

    return diagnostics;
  });

  // JavaScript Linter
  const jsLinter = linter((view) => {
    const code = view.state.doc.toString();
    const diagnostics = [];

    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      diagnostics.push({
        from: 0,
        to: code.length,
        severity: "error",
        message: `Accolades non appariées: ${openBraces} ouvertes, ${closeBraces} fermées`,
      });
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      diagnostics.push({
        from: 0,
        to: code.length,
        severity: "error",
        message: `Parenthèses non appariées: ${openParens} ouvertes, ${closeParens} fermées`,
      });
    }

    return diagnostics;
  });

  const languageExtension =
    lang === "python"
      ? [python(), pythonLinter, lintGutter()]
      : [javascript({ jsx: true }), jsLinter, lintGutter()];

  const handleChange = (val) => {
    setValue(val);
  };

  async function sendToJudge0() {
    setOutput("Exécution en cours...");
    setEduContent([]);
    setSonarResults(null);
    const languageId = lang === "javascript" ? 63 : 71;

    try {
      // Exécuter avec Judge0
      const response = await fetch(
        "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_code: value,
            language_id: languageId,
            stdin: "",
          }),
        }
      );

      const result = await response.json();

      if (result.stdout) {
        setOutput(result.stdout);
      } else if (result.stderr) {
        setOutput("Erreur:\n" + result.stderr);
      } else if (result.compile_output) {
        setOutput("Erreur de compilation:\n" + result.compile_output);
      } else {
        setOutput(JSON.stringify(result, null, 2));
      }

      // Analyser avec SonarQube
      await analyzeSonarQube();
    } catch (err) {
      setOutput("Erreur de connexion à Judge0 : " + err.message);
    }
  }

  async function analyzeSonarQube() {
    try {
      console.log("Envoi du code à SonarQube...");
      console.log("API_URL:", API_URL);

      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: value,
          language: lang
        })
      });

      const result = await response.json();
      console.log("Réponse SonarQube reçue:", result);

      setSonarResults(result);

      const diagnostics = parseSonarQubeReport(result);
      console.log("Diagnostics parsés:", diagnostics);

      const contents = mapDiagnosticsToContent(diagnostics);
      console.log("Contenus pédagogiques:", contents);

      setEduContent(contents);
    } catch (err) {
      console.error("Erreur SonarQube:", err);
    }
  }

  const currentExercise = exercises[lang];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Plateforme d'évaluation de programmation automatique</h1>
        <div className="controls">
          <label>
            Langage :
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </label>
          <button className="btn-execute" onClick={sendToJudge0}>
            ▶ Exécuter
          </button>
        </div>
      </header>

      <main className="main-container">
        <div className="left-section">
          <div className="editor-section">
            <h2>Éditeur</h2>
            <CodeMirror
              value={value}
              height="100%"
              extensions={languageExtension}
              onChange={handleChange}
              basicSetup={true}
            />
          </div>
        </div>

        <div className="right-section">
          <div className="exercise-section">
            <h2>{currentExercise.title}</h2>
            <div className="exercise-content">
              <p>{currentExercise.description}</p>

              {/* Résultats SonarQube */}
              {sonarResults && (
                <div style={{ marginTop: 16, padding: 12, background: "#fff3cd", borderRadius: 6 }}>
                  <h3> Analyse de qualité (SonarQube)</h3>
                  <p><strong>Total issues:</strong> {sonarResults.stats?.total || 0}</p>
                  <p><strong> Bugs:</strong> {sonarResults.stats?.bugs || 0}</p>
                  <p><strong> Vulnérabilités:</strong> {sonarResults.stats?.vulnerabilities || 0}</p>
                  <p><strong> Code Smells:</strong> {sonarResults.stats?.codeSmells || 0}</p>
                </div>
              )}

              {/* Contenus pédagogiques */}
              {eduContent.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3>Ressources recommandées</h3>
                  {eduContent.map((c) => (
                    <div key={c.key} style={{ marginBottom: 12, textAlign: "left" }}>
                      <strong>{c.title}</strong>
                      <p style={{ margin: "6px 0" }}>{c.explanation}</p>
                      <pre style={{ background: "#f6f8fa", padding: 8 }}>{c.example}</pre>
                      <p style={{ margin: 0, fontSize: 13, color: "#444" }}>
                        <em>Fix:</em> {c.fix}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="output-section">
        <h3>Résultat d'exécution</h3>
        <pre className="output-box">{output}</pre>
      </footer>
    </div>
  );
}
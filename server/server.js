import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, "temp_code");

// Configuration SonarQube
const SONARQUBE_URL = process.env.SONARQUBE_URL;
const SONARQUBE_TOKEN = process.env.SONARQUBE_TOKEN;

if (!SONARQUBE_TOKEN) {
  console.error("SONARQUBE_TOKEN non configuré dans .env");
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Endpoint : Analyser le code avec SonarQube API
 */
app.post("/analyze", async (req, res) => {
  const { code, language } = req.body;

  console.log("Code reçu:", code.substring(0, 50) + "...");
  console.log("Langage:", language);

  if (!code || !language) {
    return res.status(400).json({ error: "Code et langage requis" });
  }

  try {
    const fileExtension = language === "python" ? "py" : "js";
    const projectKey = `local-project-${language}-${Date.now()}`;
    const fileName = `code_${Date.now()}.${fileExtension}`;
    const filePath = path.join(TEMP_DIR, fileName);

    // Écrire le code dans un fichier
    fs.writeFileSync(filePath, code);
    console.log("Fichier créé:", filePath);

    // Créer le projet dans SonarQube
    console.log("Création du projet dans SonarQube...");
    await createSonarQubeProject(projectKey);

    // Uploader le fichier à SonarQube
    console.log("Upload du code à SonarQube...");
    await uploadCodeToSonarQube(projectKey, filePath, fileExtension);

    // Attendre que l'analyse soit terminée
    console.log("Attente de l'analyse...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Récupérer les résultats
    console.log("Récupération des résultats...");
    const issues = await getSonarQubeIssues(projectKey);
    console.log("Issues trouvées:", issues.length);

    // Nettoyer
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      projectKey,
      issues: issues,
      stats: {
        total: issues.length,
        bugs: issues.filter(i => i.type === "BUG").length,
        vulnerabilities: issues.filter(i => i.type === "VULNERABILITY").length,
        codeSmells: issues.filter(i => i.type === "CODE_SMELL").length
      }
    });

  } catch (err) {
    console.error("Erreur:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message
    });
  }
});

/**
 * Créer un projet dans SonarQube
 */
async function createSonarQubeProject(projectKey) {
  try {
    await axios.post(
      `${SONARQUBE_URL}/api/projects/create?project=${projectKey}&name=${projectKey}`,
      {},
      {
        auth: {
          username: SONARQUBE_TOKEN,
          password: ""
        }
      }
    );
    console.log("Projet créé:", projectKey);
  } catch (err) {
    if (err.response?.status === 400) {
      console.log("Projet existe déjà:", projectKey);
    } else {
      throw err;
    }
  }
}

/**
 * Uploader le code à SonarQube
 */
async function uploadCodeToSonarQube(projectKey, filePath, fileExtension) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    
    // Envoyer le code via l'API SonarQube
    await axios.post(
      `${SONARQUBE_URL}/api/sources/raw?project=${projectKey}&file=${projectKey}:src/code.${fileExtension}`,
      code,
      {
        headers: { "Content-Type": "text/plain" },
        auth: {
          username: SONARQUBE_TOKEN,
          password: ""
        }
      }
    );
    console.log("Code uploadé à SonarQube");
  } catch (err) {
    console.error("Erreur lors de l'upload:", err.message);
    // Continuer quand même
  }
}

/**
 * Récupérer les issues depuis SonarQube
 */
async function getSonarQubeIssues(projectKey) {
  try {
    const url = `${SONARQUBE_URL}/api/issues/search?projectKeys=${projectKey}`;
    console.log("Requête API:", url);

    const response = await axios.get(url, {
      auth: {
        username: SONARQUBE_TOKEN,
        password: ""
      },
      timeout: 10000
    });

    console.log("Réponse API:", response.data.issues?.length || 0, "issues");
    return response.data.issues || [];
  } catch (err) {
    console.error("Erreur API SonarQube:", err.message);
    return [];
  }
}

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({ 
    status: "Backend actif", 
    port: PORT,
    sonarqube: SONARQUBE_URL
  });
});

/**
 * Tester connexion SonarQube
 */
app.get("/sonarqube-status", async (req, res) => {
  try {
    const response = await axios.get(`${SONARQUBE_URL}/api/system/status`, {
      timeout: 5000
    });
    res.json({
      sonarqube: "connecté",
      status: response.data.status,
      version: response.data.version
    });
  } catch (err) {
    res.status(500).json({
      sonarqube: "déconnecté",
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend sur http://localhost:${PORT}`);
  console.log(`SonarQube: ${SONARQUBE_URL}`);
  console.log(`Token configuré: ${SONARQUBE_TOKEN.slice(0, 10)}...`);
});
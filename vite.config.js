import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'audit-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Intercept only POST requests to /api/audit
          if (req.url === '/api/audit' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                
                // Define logs directory
                const logsDir = path.resolve(process.cwd(), 'logs');
                if (!fs.existsSync(logsDir)) {
                  fs.mkdirSync(logsDir, { recursive: true });
                }

                const logTimestamp = new Date().toLocaleString('pt-BR');
                const isoTimestamp = new Date().toISOString();

                // 1. Format and write to text log file (audit.log)
                const logLine = `[${logTimestamp}] ID: ${data.id} | Aluno: ${data.student.name || 'N/A'} (${data.student.course || 'N/A'} - ${data.student.semester || 'N/A'}) | Projeto: ${data.project.name || 'N/A'} (Orientador: ${data.project.advisor || 'N/A'}) | Horas Totais: ${data.totalHours}h\n`;
                fs.appendFileSync(path.join(logsDir, 'audit.log'), logLine, 'utf8');

                // 2. Format and save to structured JSON file (audit_db.json)
                const dbPath = path.join(logsDir, 'audit_db.json');
                let dbData = [];
                if (fs.existsSync(dbPath)) {
                  try {
                    const rawContent = fs.readFileSync(dbPath, 'utf8');
                    dbData = JSON.parse(rawContent);
                  } catch (e) {
                    console.error("Erro ao ler/parsear audit_db.json, reiniciando array:", e);
                    dbData = [];
                  }
                }

                // Construct clean audit record without base64 photos to save disk space
                const auditRecord = {
                  id: data.id,
                  timestamp: data.timestamp || isoTimestamp,
                  student: {
                    name: data.student.name || "",
                    course: data.student.course || "",
                    semester: data.student.semester || ""
                  },
                  project: {
                    name: data.project.name || "",
                    advisor: data.project.advisor || ""
                  },
                  totalHours: parseFloat(data.totalHours) || 0,
                  activities: (data.activities || []).map(act => ({
                    date: act.date || "",
                    hours: parseFloat(act.hours) || 0,
                    description: act.description || ""
                  }))
                };

                dbData.push(auditRecord);
                fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');

                // Response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Dados de auditoria salvos localmente no servidor!' }));
              } catch (err) {
                console.error("Erro no middleware de auditoria:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ]
});

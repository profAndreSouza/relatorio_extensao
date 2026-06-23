/* ==========================================================================
   AUDITORIA DASHBOARD & SECURITY ENGINE
   ========================================================================== */

const PASSWORD_HASH = "AUDIT_SENAI_2026"; // Hardcoded security token

let auditHistory = [];

const elements = {
  // Authentication Elements
  loginContainer: document.getElementById('login-container'),
  loginForm: document.getElementById('login-form'),
  passwordInput: document.getElementById('password-input'),
  
  // Dashboard Elements
  dashboardContainer: document.getElementById('dashboard-container'),
  btnLogout: document.getElementById('btn-logout'),
  
  // Controls & Actions
  search: document.getElementById('audit-search'),
  tableBody: document.getElementById('audit-table-body'),
  statCount: document.getElementById('audit-stat-count'),
  statHours: document.getElementById('audit-stat-hours'),
  btnClear: document.getElementById('btn-audit-clear'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnExportSqlite: document.getElementById('btn-export-sqlite'),
  
  // Details Panel
  detailsPanel: document.getElementById('audit-details-panel'),
  detailsContent: document.getElementById('audit-details-content'),
  detailsClose: document.getElementById('btn-details-close')
};

// Check if already authenticated in this session
function checkAuth() {
  const isAuth = sessionStorage.getItem('audit_authenticated');
  if (isAuth === 'true') {
    showDashboard();
  } else {
    elements.loginContainer.style.display = 'block';
    elements.dashboardContainer.style.display = 'none';
  }
}

// Show Dashboard UI and initialize logs
function showDashboard() {
  elements.loginContainer.style.display = 'none';
  elements.dashboardContainer.style.display = 'flex';
  
  loadAuditHistory();
  renderAuditTable();
  elements.detailsPanel.style.display = 'none';
  
  lucide.createIcons();
}

// Perform Login check
function handleLogin() {
  const enteredPass = elements.passwordInput.value;
  if (enteredPass === PASSWORD_HASH) {
    sessionStorage.setItem('audit_authenticated', 'true');
    showDashboard();
    elements.passwordInput.value = "";
  } else {
    alert("Chave de segurança incorreta. Acesso negado.");
    elements.passwordInput.value = "";
    elements.passwordInput.focus();
  }
}

// Perform Logout
function handleLogout() {
  sessionStorage.removeItem('audit_authenticated');
  window.location.reload();
}

// Database / localStorage helpers
function loadAuditHistory() {
  const saved = localStorage.getItem('unisenai_extension_audit_history');
  if (saved) {
    try {
      auditHistory = JSON.parse(saved);
    } catch (e) {
      console.error("Erro ao carregar logs do LocalStorage:", e);
      auditHistory = [];
    }
  } else {
    auditHistory = [];
  }
}

function saveAuditHistory() {
  localStorage.setItem('unisenai_extension_audit_history', JSON.stringify(auditHistory));
}

// Format date helper ISO (YYYY-MM-DD) to Brazilian format (DD/MM/YYYY)
function formatDateBR(dateStr) {
  if (!dateStr) return "--/--/----";
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

// Render Audit Logs Table
function renderAuditTable(query = '') {
  const tbody = elements.tableBody;
  tbody.innerHTML = '';

  const cleanQuery = query.toLowerCase().trim();
  const filtered = auditHistory.filter(record => {
    return (record.student.name || '').toLowerCase().includes(cleanQuery) ||
           (record.student.course || '').toLowerCase().includes(cleanQuery) ||
           (record.project.name || '').toLowerCase().includes(cleanQuery);
  });

  // Sort by timestamp descending (newest first)
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  let totalHoursAccumulated = 0;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 24px;">Nenhum registro de relatório de auditoria localizado.</td>
      </tr>
    `;
  } else {
    filtered.forEach(record => {
      totalHoursAccumulated += parseFloat(record.totalHours) || 0;
      const dateObj = new Date(record.timestamp);
      const formattedDate = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formattedDate}</td>
        <td class="font-bold">${record.student.name || 'Sem nome'}</td>
        <td>${record.student.course || '--'}</td>
        <td>${record.project.name || '--'}</td>
        <td class="text-center font-bold text-primary">${record.totalHours}h</td>
        <td class="text-center">
          <button class="btn-details-view" data-id="${record.id}">
            <i data-lucide="eye" style="width: 12px; height: 12px;"></i> Ver
          </button>
        </td>
      `;
      
      tr.querySelector('.btn-details-view').addEventListener('click', () => {
        showAuditDetails(record);
      });
      
      tbody.appendChild(tr);
    });
  }

  // Update stats counters
  elements.statCount.textContent = filtered.length;
  elements.statHours.textContent = `${totalHoursAccumulated}h`;
  
  lucide.createIcons();
}

// Show specific log row details
function showAuditDetails(record) {
  const container = elements.detailsContent;
  const dateObj = new Date(record.timestamp);
  const formattedDate = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  let activitiesHTML = '';
  if (!record.activities || record.activities.length === 0) {
    activitiesHTML = '<div class="text-muted text-center py-2">Nenhuma atividade descrita neste relatório.</div>';
  } else {
    record.activities.forEach((act, idx) => {
      activitiesHTML += `
        <div class="details-activity-item">
          <div class="details-activity-head">
            <span>Atividade #${idx + 1} - ${formatDateBR(act.date)}</span>
            <span class="font-bold text-primary">${act.hours}h</span>
          </div>
          <div class="details-activity-desc">${act.description || 'Sem descrição.'}</div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <div class="details-meta-grid">
      <div class="details-meta-item"><strong>Estudante:</strong> ${record.student.name || '--'}</div>
      <div class="details-meta-item"><strong>Curso:</strong> ${record.student.course || '--'} (${record.student.semester || '--'})</div>
      <div class="details-meta-item"><strong>Projeto:</strong> ${record.project.name || '--'}</div>
      <div class="details-meta-item"><strong>Orientador:</strong> ${record.project.advisor || '--'}</div>
      <div class="details-meta-item"><strong>Data Geração:</strong> ${formattedDate}</div>
      <div class="details-meta-item"><strong>Total Horas:</strong> <span class="font-bold text-primary">${record.totalHours}h</span></div>
    </div>
    <div style="margin-top: 12px;">
      <h4 style="margin-bottom: 8px; font-weight:600; color:var(--text-main); font-size:0.8rem;">Atividades Relacionadas:</h4>
      <div class="details-activities-list">
        ${activitiesHTML}
      </div>
    </div>
  `;

  elements.detailsPanel.style.display = 'block';
  elements.detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Bind all listeners
function setupListeners() {
  // Login Form
  elements.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
  });
  
  // Logout
  elements.btnLogout.addEventListener('click', handleLogout);
  
  // Search
  elements.search.addEventListener('input', () => {
    renderAuditTable(elements.search.value);
  });
  
  // Details drawer close
  elements.detailsClose.addEventListener('click', () => {
    elements.detailsPanel.style.display = 'none';
  });
  
  // Clear Logs
  elements.btnClear.addEventListener('click', () => {
    if (confirm("Tem certeza que deseja apagar TODO o histórico de auditoria local? Esta ação não pode ser desfeita.")) {
      if (confirm("CONFIRMAÇÃO ADICIONAL: Você apagará permanentemente todos os registros do navegador local. Prosseguir?")) {
        auditHistory = [];
        saveAuditHistory();
        renderAuditTable();
        elements.detailsPanel.style.display = 'none';
      }
    }
  });

  // Export JSON Dump
  elements.btnExportJson.addEventListener('click', () => {
    if (auditHistory.length === 0) {
      alert("Não há registros no histórico para exportar.");
      return;
    }
    const jsonStr = JSON.stringify(auditHistory, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_auditoria_unisenai_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Export SQLite compiled .db
  elements.btnExportSqlite.addEventListener('click', async () => {
    if (auditHistory.length === 0) {
      alert("Não há registros no histórico para exportar.");
      return;
    }

    const originalHTML = elements.btnExportSqlite.innerHTML;
    elements.btnExportSqlite.disabled = true;
    elements.btnExportSqlite.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 12px; height: 12px;"></i> Processando...`;
    lucide.createIcons();

    try {
      if (typeof initSqlJs === 'undefined') {
        throw new Error("A biblioteca SQL.js não pôde ser carregada remotamente. Verifique sua conexão com a Internet.");
      }
      
      const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });

      const db = new SQL.Database();
      
      // Create schema
      db.run(`
        CREATE TABLE IF NOT EXISTS relatorios (
          id TEXT PRIMARY KEY,
          timestamp TEXT,
          estudante_nome TEXT,
          estudante_curso TEXT,
          estudante_semestre TEXT,
          projeto_nome TEXT,
          projeto_orientador TEXT,
          total_horas REAL
        );
      `);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS atividades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          relatorio_id TEXT,
          data TEXT,
          horas REAL,
          descricao TEXT,
          FOREIGN KEY(relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE
        );
      `);

      // Populate database
      auditHistory.forEach(record => {
        db.run(`
          INSERT INTO relatorios (id, timestamp, estudante_nome, estudante_curso, estudante_semestre, projeto_nome, projeto_orientador, total_horas)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          record.id,
          record.timestamp,
          record.student.name || "",
          record.student.course || "",
          record.student.semester || "",
          record.project.name || "",
          record.project.advisor || "",
          parseFloat(record.totalHours) || 0
        ]);

        if (record.activities && record.activities.length > 0) {
          record.activities.forEach(act => {
            db.run(`
              INSERT INTO atividades (relatorio_id, data, horas, descricao)
              VALUES (?, ?, ?, ?)
            `, [
              record.id,
              act.date || "",
              parseFloat(act.hours) || 0,
              act.description || ""
            ]);
          });
        }
      });

      const binaryArray = db.export();
      const blob = new Blob([binaryArray], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_relatorios_unisenai_${Date.now()}.db`;
      a.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 200);
    } catch (error) {
      console.error("Erro no exportador SQLite:", error);
      alert(`Falha ao compilar SQLite: ${error.message}. Baixando dump JSON como fallback.`);
      elements.btnExportJson.click();
    } finally {
      elements.btnExportSqlite.disabled = false;
      elements.btnExportSqlite.innerHTML = originalHTML;
      lucide.createIcons();
    }
  });
}

// Startup
window.addEventListener('DOMContentLoaded', () => {
  setupListeners();
  checkAuth();
  lucide.createIcons();
});

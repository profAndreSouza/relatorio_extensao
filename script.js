/* ==========================================================================
   APPLICATION STATE & CORE LOGIC
   ========================================================================== */

let state = {
  student: {
    name: "",
    course: "",
    semester: ""
  },
  project: {
    name: "",
    advisor: ""
  },
  activities: []
};

// Unique ID Generator
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

/* ==========================================================================
   DOM ELEMENTS
   ========================================================================== */
const elements = {
  // Inputs
  studentName: document.getElementById('student-name'),
  studentCourse: document.getElementById('student-course'),
  studentSemester: document.getElementById('student-semester'),
  projectName: document.getElementById('project-name'),
  projectAdvisor: document.getElementById('project-advisor'),
  
  // Buttons
  btnAddActivity: document.getElementById('btn-add-activity'),
  btnClear: document.getElementById('btn-clear'),
  btnGenerate: document.getElementById('btn-generate'),
  btnPrintPreview: document.getElementById('btn-print-preview'),
  
  // Containers / Displays
  activitiesContainer: document.getElementById('activities-container'),
  hoursTotalBadge: document.getElementById('hours-total-badge'),
  
  // Preview Elements
  previewStudentName: document.getElementById('preview-student-name'),
  previewStudentCourse: document.getElementById('preview-student-course'),
  previewStudentSemester: document.getElementById('preview-student-semester'),
  previewProjectName: document.getElementById('preview-project-name'),
  previewProjectAdvisor: document.getElementById('preview-project-advisor'),
  
  previewSignatureStudentName: document.getElementById('preview-signature-student-name'),
  previewSignatureAdvisorName: document.getElementById('preview-signature-advisor-name'),
  
  previewActivitiesBody: document.getElementById('preview-activities-body'),
  previewTotalHours: document.getElementById('preview-total-hours'),
  previewEvidenceGrid: document.getElementById('preview-evidence-grid'),
  previewEvidenceSection: document.getElementById('preview-evidence-section')
};

/* ==========================================================================
   IMAGE COMPRESSION & CONVERSION
   ========================================================================== */
function compressAndSavePhoto(file, activityId) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function (event) {
    const img = new Image();
    img.src = event.target.result;
    
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 600; // Optimal resolution for A4 print
      const MAX_HEIGHT = 450;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG with 70% quality (ideal balance of size and visibility)
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      
      // Update state
      const activityIndex = state.activities.findIndex(a => a.id === activityId);
      if (activityIndex !== -1) {
        state.activities[activityIndex].photo = compressedBase64;
        updateUI();
        saveToLocalStorage();
      }
    };
  };
}

/* ==========================================================================
   LOCAL STORAGE STORAGE HELPERS
   ========================================================================== */
function saveToLocalStorage() {
  localStorage.setItem('unisenai_extension_report', JSON.stringify(state));
}

function loadFromLocalStorage() {
  const savedData = localStorage.getItem('unisenai_extension_report');
  if (savedData) {
    try {
      state = JSON.parse(savedData);
      
      // Set Form Values
      elements.studentName.value = state.student.name || "";
      elements.studentCourse.value = state.student.course || "";
      elements.studentSemester.value = state.student.semester || "";
      elements.projectName.value = state.project.name || "";
      elements.projectAdvisor.value = state.project.advisor || "";
      
      // Rebuild activity UI cards
      renderActivitiesList();
      updateUI();
    } catch (e) {
      console.error("Erro ao carregar dados do LocalStorage:", e);
    }
  } else {
    // If no storage, pre-load 1 empty activity card for tutorial/onboarding feel
    addEmptyActivity();
  }
}

/* ==========================================================================
   REACTIVE UPDATES & RENDERING
   ========================================================================== */

// Helper to format date ISO (YYYY-MM-DD) to Brazilian Format (DD/MM/YYYY)
function formatDateBR(dateStr) {
  if (!dateStr) return "--/--/----";
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Update all text labels on the preview sheet
function updateUI() {
  // Student Info Preview
  elements.previewStudentName.textContent = state.student.name || "NOME DO ESTUDANTE";
  elements.previewStudentCourse.textContent = state.student.course || "NÃO INFORMADO";
  elements.previewStudentSemester.textContent = state.student.semester || "NÃO INFORMADO";
  
  // Project Info Preview
  elements.previewProjectName.textContent = state.project.name || "NOME DO PROJETO DE EXTENSÃO";
  elements.previewProjectAdvisor.textContent = state.project.advisor || "NOME DO PROFESSOR ORIENTADOR";
  
  // Signatures Names Preview
  elements.previewSignatureStudentName.textContent = state.student.name || "Assinatura do Estudante";
  elements.previewSignatureAdvisorName.textContent = state.project.advisor || "Assinatura do Orientador";
  
  // Update Activities Table and Evidences
  updatePreviewTables();
  
  // Initialize Lucide icons for any dynamically generated nodes
  lucide.createIcons();
}

// Render Preview Sections (Table & Image Annex)
function updatePreviewTables() {
  const tbody = elements.previewActivitiesBody;
  const evidenceGrid = elements.previewEvidenceGrid;
  
  tbody.innerHTML = "";
  evidenceGrid.innerHTML = "";
  
  let totalHours = 0;
  let hasPhotos = false;
  let photoIndex = 1;
  
  if (state.activities.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="3" class="text-center text-muted">Nenhuma atividade cadastrada.</td>
      </tr>
    `;
  } else {
    state.activities.forEach((act) => {
      // Calculate Hours
      const actHours = parseFloat(act.hours) || 0;
      totalHours += actHours;
      
      // Render Table Row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="w-15 text-center">${formatDateBR(act.date)}</td>
        <td class="w-70" style="white-space: pre-line;">${act.description || "Sem descrição informada."}</td>
        <td class="w-15 text-center font-bold">${actHours}h</td>
      `;
      tbody.appendChild(tr);
      
      // Render Photos inside Evidence section
      if (act.photo) {
        hasPhotos = true;
        const evidenceCard = document.createElement('div');
        evidenceCard.className = "evidence-item";
        evidenceCard.innerHTML = `
          <div class="evidence-img-container">
            <img src="${act.photo}" alt="Evidência ${photoIndex}">
          </div>
          <span class="evidence-caption">Figura ${photoIndex}: Atividade realizada em ${formatDateBR(act.date)} - ${act.hours}h</span>
        `;
        evidenceGrid.appendChild(evidenceCard);
        photoIndex++;
      }
    });
  }
  
  // Update Hours displays
  elements.previewTotalHours.textContent = `${totalHours}h`;
  elements.hoursTotalBadge.innerHTML = `Total: <strong>${totalHours}h</strong>`;
  
  // Toggle Evidence section visibility based on photo presence
  if (hasPhotos) {
    elements.previewEvidenceSection.style.display = "block";
  } else {
    elements.previewEvidenceSection.style.display = "none";
  }
}

// Render form list card in editing sidebar
function renderActivitiesList() {
  elements.activitiesContainer.innerHTML = "";
  state.activities.forEach((activity, index) => {
    createActivityCardDOM(activity, index + 1);
  });
}

// Create a physical card in the form UI
function createActivityCardDOM(activity, displayIndex) {
  const card = document.createElement('div');
  card.className = "activity-card";
  card.dataset.id = activity.id;
  
  card.innerHTML = `
    <div class="activity-card-header">
      <span class="activity-num">Atividade #${displayIndex}</span>
      <button type="button" class="btn-remove-activity" title="Excluir Atividade">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
    
    <div class="form-grid">
      <div class="input-group">
        <label>Data</label>
        <input type="date" class="act-date" value="${activity.date || ''}">
      </div>
      <div class="input-group">
        <label>Horas Realizadas</label>
        <input type="number" class="act-hours" min="0" step="0.5" placeholder="Ex: 4" value="${activity.hours || ''}">
      </div>
      <div class="input-group full-width">
        <label>Descrição da Atividade</label>
        <textarea class="act-desc" placeholder="Descreva sucintamente o que foi realizado nesta atividade...">${activity.description || ''}</textarea>
      </div>
      
      <!-- Photo Area -->
      <div class="photo-uploader-container">
        <span class="photo-uploader-label">Foto / Comprovante (Opcional)</span>
        
        <div class="photo-dropzone-wrapper" style="${activity.photo ? 'display: none;' : ''}">
          <label class="photo-dropzone">
            <i data-lucide="camera"></i>
            <span>Clique ou arraste uma foto</span>
            <input type="file" accept="image/*" class="act-photo-input" style="display: none;">
          </label>
        </div>

        <div class="photo-preview-wrapper" style="${activity.photo ? '' : 'display: none;'}">
          <div class="photo-preview-card">
            <img class="photo-preview-img" src="${activity.photo || ''}" alt="Preview">
            <button type="button" class="btn-delete-photo" title="Remover Foto">
              <i data-lucide="x"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Set up event listeners for inputs within the card
  const dateInput = card.querySelector('.act-date');
  const hoursInput = card.querySelector('.act-hours');
  const descInput = card.querySelector('.act-desc');
  const fileInput = card.querySelector('.act-photo-input');
  const removeBtn = card.querySelector('.btn-remove-activity');
  const deletePhotoBtn = card.querySelector('.btn-delete-photo');
  const dropzone = card.querySelector('.photo-dropzone');
  
  // Save content to state on edit
  const updateStateValue = () => {
    const act = state.activities.find(a => a.id === activity.id);
    if (act) {
      act.date = dateInput.value;
      act.hours = hoursInput.value;
      act.description = descInput.value;
      updateUI();
      saveToLocalStorage();
    }
  };
  
  dateInput.addEventListener('input', updateStateValue);
  hoursInput.addEventListener('input', updateStateValue);
  descInput.addEventListener('input', updateStateValue);
  
  // Remove Activity Click handler
  removeBtn.addEventListener('click', () => {
    removeActivity(activity.id);
  });
  
  // File Upload handler
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      compressAndSavePhoto(file, activity.id);
    }
  });

  // Drag and drop events for dropzone
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
    dropzone.style.backgroundColor = 'var(--primary-light)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border)';
    dropzone.style.backgroundColor = '#fff';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border)';
    dropzone.style.backgroundColor = '#fff';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      compressAndSavePhoto(file, activity.id);
    }
  });
  
  // Delete Photo Click handler
  deletePhotoBtn.addEventListener('click', () => {
    const act = state.activities.find(a => a.id === activity.id);
    if (act) {
      act.photo = null;
      updateUI();
      saveToLocalStorage();
      
      // Update form card display directly without rebuilding the whole list
      card.querySelector('.photo-dropzone-wrapper').style.display = 'block';
      card.querySelector('.photo-preview-wrapper').style.display = 'none';
      card.querySelector('.photo-preview-img').src = '';
      fileInput.value = ''; // Clear file input value
    }
  });
  
  elements.activitiesContainer.appendChild(card);
  lucide.createIcons();
}

/* ==========================================================================
   MUTATIONS (ADD / REMOVE ACTIVITIES)
   ========================================================================== */
function addEmptyActivity() {
  const newActivity = {
    id: generateId(),
    date: "",
    hours: "",
    description: "",
    photo: null
  };
  
  state.activities.push(newActivity);
  createActivityCardDOM(newActivity, state.activities.length);
  updateUI();
  saveToLocalStorage();
}

function removeActivity(id) {
  state.activities = state.activities.filter(a => a.id !== id);
  renderActivitiesList();
  updateUI();
  saveToLocalStorage();
}

/* ==========================================================================
   EVENT BINDINGS & INITIALIZATION
   ========================================================================== */

// Student details listeners
elements.studentName.addEventListener('input', (e) => {
  state.student.name = e.target.value;
  updateUI();
  saveToLocalStorage();
});

elements.studentCourse.addEventListener('change', (e) => {
  state.student.course = e.target.value;
  updateUI();
  saveToLocalStorage();
});
elements.studentSemester.addEventListener('input', (e) => {
  state.student.semester = e.target.value;
  updateUI();
  saveToLocalStorage();
});

// Project details listeners
elements.projectName.addEventListener('input', (e) => {
  state.project.name = e.target.value;
  updateUI();
  saveToLocalStorage();
});
elements.projectAdvisor.addEventListener('input', (e) => {
  state.project.advisor = e.target.value;
  updateUI();
  saveToLocalStorage();
});


// Add activity button click
elements.btnAddActivity.addEventListener('click', addEmptyActivity);

// Clear form button click
elements.btnClear.addEventListener('click', () => {
  if (confirm("Tem certeza que deseja apagar todos os dados do formulário? Esta ação não pode ser desfeita.")) {
    state = {
      student: { name: "", course: "", semester: "" },
      project: { name: "", advisor: "" },
      activities: []
    };
    
    // Clear inputs
    elements.studentName.value = "";
    elements.studentCourse.value = "";
    elements.studentSemester.value = "";
    elements.projectName.value = "";
    elements.projectAdvisor.value = "";
    
    elements.activitiesContainer.innerHTML = "";
    
    // Remove local storage
    localStorage.removeItem('unisenai_extension_report');
    
    // Add one fresh card
    addEmptyActivity();
    
    // Update preview
    updateUI();
  }
});

// PDF Generation using html2pdf
function generatePDF() {
  // Save record to audit log
  saveAuditRecord();

  const element = document.getElementById('report-sheet');
  const studentCleanName = (state.student.name || "aluno").trim().toLowerCase().replace(/\s+/g, '_');
  
  // Visual feedback: disable buttons and show loading state
  const originalTextGenerate = elements.btnGenerate.innerHTML;
  const originalTextPreview = elements.btnPrintPreview.innerHTML;
  
  elements.btnGenerate.disabled = true;
  elements.btnGenerate.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Gerando PDF...`;
  
  elements.btnPrintPreview.disabled = true;
  elements.btnPrintPreview.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Gerando...`;
  lucide.createIcons();

  // Add a temporary printing class to clean borders/margins during rendering
  element.classList.add('rendering-pdf');

  // Configure pdf generation settings
  const opt = {
    margin:       0, // CSS padding of .a4-page handles A4 margins perfectly
    filename:     `relatorio_extensao_${studentCleanName}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2.2, // Balance quality and file size
      useCORS: true, 
      logging: false,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['avoid-all', 'css'] } // Avoids cutting images/paragraphs in half
  };

  // Convert HTML element to PDF
  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      // Restore buttons state
      elements.btnGenerate.disabled = false;
      elements.btnGenerate.innerHTML = originalTextGenerate;
      
      elements.btnPrintPreview.disabled = false;
      elements.btnPrintPreview.innerHTML = originalTextPreview;
      
      element.classList.remove('rendering-pdf');
      lucide.createIcons();
    })
    .catch(err => {
      console.error("Erro ao gerar PDF:", err);
      alert("Não foi possível gerar o PDF diretamente. Abrindo a janela de impressão nativa...");
      
      // Fallback to native print
      window.print();
      
      elements.btnGenerate.disabled = false;
      elements.btnGenerate.innerHTML = originalTextGenerate;
      elements.btnPrintPreview.disabled = false;
      elements.btnPrintPreview.innerHTML = originalTextPreview;
      element.classList.remove('rendering-pdf');
      lucide.createIcons();
    });
}

// PDF generation trigger events
elements.btnGenerate.addEventListener('click', generatePDF);
elements.btnPrintPreview.addEventListener('click', generatePDF);

/* ==========================================================================
   AUDIT LOGS & SQLITE EXPORT ENGINE
   ========================================================================== */
let auditHistory = [];

const auditElements = {
  btnOpen: document.getElementById('btn-audit-open'),
  btnClose: document.getElementById('btn-audit-close'),
  modal: document.getElementById('audit-modal'),
  search: document.getElementById('audit-search'),
  tableBody: document.getElementById('audit-table-body'),
  statCount: document.getElementById('audit-stat-count'),
  statHours: document.getElementById('audit-stat-hours'),
  btnClear: document.getElementById('btn-audit-clear'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnExportSqlite: document.getElementById('btn-export-sqlite'),
  detailsPanel: document.getElementById('audit-details-panel'),
  detailsContent: document.getElementById('audit-details-content'),
  detailsClose: document.getElementById('btn-details-close')
};

function saveAuditHistory() {
  localStorage.setItem('unisenai_extension_audit_history', JSON.stringify(auditHistory));
}

function loadAuditHistory() {
  const saved = localStorage.getItem('unisenai_extension_audit_history');
  if (saved) {
    try {
      auditHistory = JSON.parse(saved);
    } catch (e) {
      console.error("Erro ao carregar histórico de auditoria:", e);
      auditHistory = [];
    }
  }
}

function saveAuditRecord() {
  // Don't log if there is no student name and no activities configured
  if (!state.student.name && state.activities.length === 0) return;

  let totalHours = 0;
  state.activities.forEach(act => {
    totalHours += parseFloat(act.hours) || 0;
  });

  const auditRecord = {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    student: {
      name: state.student.name || "",
      course: state.student.course || "",
      semester: state.student.semester || ""
    },
    project: {
      name: state.project.name || "",
      advisor: state.project.advisor || ""
    },
    totalHours: totalHours,
    activities: state.activities.map(act => ({
      date: act.date || "",
      hours: parseFloat(act.hours) || 0,
      description: act.description || ""
    }))
  };

  // 1. Save locally in user history
  auditHistory.push(auditRecord);
  saveAuditHistory();

  // 2. Save on backend if running locally
  fetch('/api/audit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(auditRecord)
  })
  .then(res => res.json())
  .then(data => {
    console.log("Auditoria gravada no servidor:", data);
  })
  .catch(err => {
    console.warn("Servidor de auditoria local offline (salvo localmente no navegador):", err);
  });
}

function renderAuditTable(query = '') {
  const tbody = auditElements.tableBody;
  tbody.innerHTML = '';

  const cleanQuery = query.toLowerCase().trim();
  const filtered = auditHistory.filter(record => {
    return (record.student.name || '').toLowerCase().includes(cleanQuery) ||
           (record.student.course || '').toLowerCase().includes(cleanQuery) ||
           (record.project.name || '').toLowerCase().includes(cleanQuery);
  });

  // Sort by timestamp descending
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  let totalHoursAccumulated = 0;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 24px;">Nenhum relatório gerado no histórico.</td>
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
            <i data-lucide="eye"></i> Ver
          </button>
        </td>
      `;
      
      tr.querySelector('.btn-details-view').addEventListener('click', () => {
        showAuditDetails(record);
      });
      
      tbody.appendChild(tr);
    });
  }

  // Update statistics indicators
  auditElements.statCount.textContent = filtered.length;
  auditElements.statHours.textContent = `${totalHoursAccumulated}h`;
  
  lucide.createIcons();
}

function showAuditDetails(record) {
  const container = auditElements.detailsContent;
  const dateObj = new Date(record.timestamp);
  const formattedDate = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  let activitiesHTML = '';
  if (!record.activities || record.activities.length === 0) {
    activitiesHTML = '<div class="text-muted text-center py-2">Nenhuma atividade registrada neste relatório.</div>';
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

  auditElements.detailsPanel.style.display = 'block';
  auditElements.detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setupAuditPanel() {
  if (!auditElements.btnOpen) return;

  // Open Modal
  auditElements.btnOpen.addEventListener('click', () => {
    loadAuditHistory();
    renderAuditTable();
    auditElements.modal.style.display = 'flex';
    auditElements.detailsPanel.style.display = 'none';
  });

  // Close Modal
  auditElements.btnClose.addEventListener('click', () => {
    auditElements.modal.style.display = 'none';
  });

  // Search / Filter
  auditElements.search.addEventListener('input', () => {
    renderAuditTable(auditElements.search.value);
  });

  // Clear History
  auditElements.btnClear.addEventListener('click', () => {
    if (confirm("Tem certeza que deseja apagar TODO o histórico de auditoria local? Esta ação não pode ser desfeita.")) {
      auditHistory = [];
      saveAuditHistory();
      renderAuditTable();
      auditElements.detailsPanel.style.display = 'none';
    }
  });

  // Details Close
  auditElements.detailsClose.addEventListener('click', () => {
    auditElements.detailsPanel.style.display = 'none';
  });

  // Export JSON
  auditElements.btnExportJson.addEventListener('click', () => {
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

  // Export SQLite
  auditElements.btnExportSqlite.addEventListener('click', async () => {
    if (auditHistory.length === 0) {
      alert("Não há registros no histórico para exportar.");
      return;
    }

    const originalHTML = auditElements.btnExportSqlite.innerHTML;
    auditElements.btnExportSqlite.disabled = true;
    auditElements.btnExportSqlite.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 12px; height: 12px;"></i> Processando...`;
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
      auditElements.btnExportJson.click();
    } finally {
      auditElements.btnExportSqlite.disabled = false;
      auditElements.btnExportSqlite.innerHTML = originalHTML;
      lucide.createIcons();
    }
  });
}

// Tutorial toggle logic
const setupTutorialToggle = () => {
  const toggle = document.getElementById('tutorial-toggle');
  const content = document.getElementById('tutorial-content');
  const chevron = document.getElementById('tutorial-chevron');
  const card = document.getElementById('tutorial-card');

  if (toggle && content && chevron && card) {
    toggle.addEventListener('click', () => {
      const isOpen = card.classList.contains('open');
      if (isOpen) {
        content.style.maxHeight = '0px';
        chevron.style.transform = 'rotate(0deg)';
        card.classList.remove('open');
      } else {
        content.style.maxHeight = '500px';
        chevron.style.transform = 'rotate(180deg)';
        card.classList.add('open');
      }
    });
  }
};

// Page Setup initialization
window.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  loadAuditHistory();
  setupTutorialToggle();
  setupAuditPanel();
  lucide.createIcons();
});

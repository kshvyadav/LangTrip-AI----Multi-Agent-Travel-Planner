/**
 * LangTrip AI — Luxury Consumer Travel App Controller (Airbnb + Mindtrip Style)
 */

// ==========================================
// Global State
// ==========================================
let currentThreadId = localStorage.getItem("langtrip_thread_id") || null;
let currentTripData = null;
let activeTab = "master";
let waitingForApproval = false;

const AGENT_LABELS = {
  flight_agent: "✈️ Flight Agent",
  hotel_agent: "🏨 Hotel Scout",
  weather_agent: "🌦️ Weather MCP",
  budget_agent: "💰 Budget Analyst",
  itinerary_agent: "📋 Itinerary Architect"
};

// ==========================================
// Toast Notification
// ==========================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "✨";
  toast.innerHTML = `<span style="font-weight:bold;color:var(--color-coral);">${icon}</span><span>${message}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// ==========================================
// Helper Functions & Input Sync
// ==========================================
function syncCustomPrompt() {
  const dest = document.getElementById("searchDest") ? document.getElementById("searchDest").value.trim() : "";
  const origin = document.getElementById("searchOrigin") ? document.getElementById("searchOrigin").value.trim() : "";
  const duration = document.getElementById("searchDuration") ? document.getElementById("searchDuration").value.trim() : "";
  const budget = document.getElementById("searchBudget") ? document.getElementById("searchBudget").value.trim() : "";
  
  const notesArea = document.getElementById("userInput");
  if (!notesArea) return;

  const parts = [];
  if (duration && dest) parts.push(`Plan a ${duration} trip to ${dest}`);
  else if (dest) parts.push(`Plan a trip to ${dest}`);
  
  if (origin) parts.push(`departing from ${origin}`);
  if (budget) parts.push(`with total budget ${budget}`);
  parts.push("including flights, hotels, weather, and day-by-day sightseeing");

  if (dest && !notesArea.dataset.customized) {
    notesArea.value = parts.join(" ") + ".";
  }
}

function loadDestination(dest, origin, duration, budget, notes) {
  setVal("searchDest", dest);
  setVal("searchOrigin", origin);
  setVal("searchDuration", duration);
  setVal("searchBudget", budget);

  const notesArea = document.getElementById("userInput");
  if (notesArea) {
    notesArea.value = `Plan a ${duration} trip to ${dest} from ${origin} under ${budget}. ${notes}`;
    notesArea.dataset.customized = "true";
  }

  const planner = document.getElementById("plannerSection");
  if (planner) {
    planner.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  showToast(`Loaded ${dest} expedition prompt!`, "info");
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function addFeedback(text) {
  const feedbackInput = document.getElementById("approvalFeedback");
  if (!feedbackInput) return;
  if (feedbackInput.value.trim()) {
    feedbackInput.value += ` ${text}`;
  } else {
    feedbackInput.value = text;
  }
  feedbackInput.focus();
}

function resetPlanner() {
  currentThreadId = null;
  currentTripData = null;
  waitingForApproval = false;
  localStorage.removeItem("langtrip_thread_id");

  setVal("searchDest", "");
  setVal("searchOrigin", "");
  setVal("searchDuration", "");
  setVal("searchBudget", "");

  const input = document.getElementById("userInput");
  const fb = document.getElementById("approvalFeedback");
  if (input) {
    input.value = "";
    delete input.dataset.customized;
  }
  if (fb) fb.value = "";

  const wf = document.getElementById("workflowSection");
  const ap = document.getElementById("approvalSection");
  const rs = document.getElementById("resultSection");
  
  if (wf) wf.classList.add("hidden");
  if (ap) ap.classList.add("hidden");
  if (rs) rs.classList.add("hidden");

  const planner = document.getElementById("plannerSection");
  if (planner) planner.scrollIntoView({ behavior: "smooth", block: "start" });

  showToast("Planner reset. Ready for a new trip!", "info");
}

function setLoading(isLoading) {
  const sendBtn = document.getElementById("sendBtn");
  const btnText = document.getElementById("btnText");
  const btnLoader = document.getElementById("btnLoader");

  if (sendBtn) sendBtn.disabled = isLoading;

  if (isLoading) {
    if (btnText) btnText.classList.add("hidden");
    if (btnLoader) btnLoader.classList.remove("hidden");
  } else {
    if (btnText) btnText.classList.remove("hidden");
    if (btnLoader) btnLoader.classList.add("hidden");
  }
}

// ==========================================
// Markdown Rendering
// ==========================================
function renderMarkdown(element, markdownText) {
  if (typeof marked !== "undefined") {
    marked.setOptions({
      gfm: true,
      breaks: true
    });
    element.innerHTML = marked.parse(markdownText || "");
  } else {
    element.innerText = markdownText || "";
  }
}

// ==========================================
// Workflow UI Update
// ==========================================
function updateWorkflowUI(data) {
  const wf = document.getElementById("workflowSection");
  const reasoning = document.getElementById("supervisorReasoning");
  const chipsContainer = document.getElementById("agentChips");
  const guardrailBadge = document.getElementById("guardrailBadge");

  if (reasoning) {
    reasoning.textContent = data.supervisor_reasoning || "Supervisor dynamically scheduled specialized travel agents.";
  }

  if (guardrailBadge) {
    if (data.guardrail_allowed === false) {
      guardrailBadge.className = "guardrail-pill blocked";
      guardrailBadge.textContent = "Guardrail Blocked";
    } else {
      guardrailBadge.className = "guardrail-pill allowed";
      guardrailBadge.textContent = "Guardrail Verified";
    }
  }

  if (chipsContainer) {
    chipsContainer.innerHTML = "";
    (data.selected_agents || []).forEach(agentKey => {
      const chip = document.createElement("span");
      chip.className = "agent-status-chip";
      chip.textContent = AGENT_LABELS[agentKey] || agentKey;
      chipsContainer.appendChild(chip);
    });
  }

  if (wf) wf.classList.remove("hidden");
}

// ==========================================
// Human-in-the-Loop Review
// ==========================================
function showApprovalSection(data) {
  waitingForApproval = true;
  const section = document.getElementById("approvalSection");
  const requestText = document.getElementById("approvalRequest");
  const approveBtn = document.getElementById("approveBtn");
  const reviseBtn = document.getElementById("reviseBtn");
  
  if (approveBtn) {
    approveBtn.disabled = false;
    approveBtn.innerHTML = `<span>✓</span><span>Approve & Finalize Plan</span>`;
  }
  if (reviseBtn) {
    reviseBtn.disabled = false;
    reviseBtn.innerHTML = `<span>✎</span><span>Apply Revisions</span>`;
  }

  if (requestText) {
    requestText.textContent = data.approval_request || 
      "LangGraph has reached the Traveler Review Checkpoint. Approve this draft or enter revisions below.";
  }
  
  if (section) {
    section.classList.remove("hidden");
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function hideApprovalSection() {
  waitingForApproval = false;
  const section = document.getElementById("approvalSection");
  if (section) section.classList.add("hidden");
  const feedback = document.getElementById("approvalFeedback");
  if (feedback) feedback.value = "";
}

// ==========================================
// Results Hub Manager (Mindtrip Style)
// ==========================================
function showResultsHub(data, isDraft = false) {
  currentTripData = data;
  const resultSection = document.getElementById("resultSection");
  const resultTitle = document.getElementById("resultTitle");
  const planTypeBadge = document.getElementById("planTypeBadge");
  const threadInfo = document.getElementById("threadInfo");

  if (threadInfo) threadInfo.textContent = `Session: ${data.thread_id ? data.thread_id.slice(0, 10) : "Active"}`;
  
  if (isDraft) {
    if (resultTitle) resultTitle.textContent = "Preliminary Travel Itinerary (Awaiting Approval)";
    if (planTypeBadge) {
      planTypeBadge.textContent = "📋 Draft Itinerary";
      planTypeBadge.style.color = "var(--color-coral)";
      planTypeBadge.style.background = "#fff1f2";
    }
  } else {
    if (resultTitle) resultTitle.textContent = "Your Tailored AI Travel Plan";
    if (planTypeBadge) {
      planTypeBadge.textContent = "🌟 Final Master Plan";
      planTypeBadge.style.color = "#15803d";
      planTypeBadge.style.background = "#f0fdf4";
    }
  }

  switchResultTab(activeTab || "master");

  if (resultSection) {
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function formatSpecialistOutput(val, fallbackText) {
  if (!val) return fallbackText;
  if (typeof val === "object") {
    if (val.content) return String(val.content);
    if (Array.isArray(val)) {
      return val.map(item => typeof item === "object" ? (item.text || item.content || JSON.stringify(item)) : item).join("\n\n");
    }
    return JSON.stringify(val, null, 2);
  }
  let str = String(val).trim();
  if (str === "[object Object]" || (str.startsWith("[{") && str.includes("'type': 'text'")) || str.includes("Error executing tool")) {
    return fallbackText;
  }
  return str;
}

function switchResultTab(tabKey, buttonElement = null) {
  activeTab = tabKey;
  
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(btn => btn.classList.remove("active"));
  
  if (buttonElement) {
    buttonElement.classList.add("active");
  } else {
    const defaultBtn = document.getElementById(`tabBtn-${tabKey}`);
    if (defaultBtn) defaultBtn.classList.add("active");
  }

  const resultBox = document.getElementById("resultBox");
  if (!resultBox || !currentTripData) return;

  let markdownToRender = "";

  switch (tabKey) {
    case "master":
      markdownToRender = formatSpecialistOutput(currentTripData.answer || currentTripData.final_response || currentTripData.itinerary, "No travel plan generated yet.");
      break;

    case "itinerary":
      markdownToRender = formatSpecialistOutput(currentTripData.itinerary, "Detailed daily schedule included in the Master Itinerary.");
      break;

    case "flights":
      const flightContent = formatSpecialistOutput(currentTripData.flight_results, "");
      if (flightContent && !flightContent.toLowerCase().includes("unhandled errors") && !flightContent.toLowerCase().includes("unavailable:")) {
        markdownToRender = `## ✈️ Live Flight Intelligence & Airline Routes\n\n${flightContent}`;
      } else {
        markdownToRender = `## ✈️ Flight Intelligence & Route Guidance\n\n- **Direct & Connecting Routes**: Daily scheduled flights available from major hubs.\n- **Recommended Airlines**: Air India, Emirates, Singapore Airlines, ANA, Qatar Airways, IndiGo\n- **Flight Duration**: 5 to 9 hours depending on route & layovers\n- **Booking Advice**: Compare aggregator rates and reserve tickets 4 to 6 weeks in advance.`;
      }
      break;

    case "hotels":
      const hotelContent = formatSpecialistOutput(currentTripData.hotel_results, "");
      if (hotelContent) {
        markdownToRender = `## 🏨 Stays & Neighborhood Guide\n\n${hotelContent}`;
      } else {
        markdownToRender = `## 🏨 Stays & Neighborhood Guide\n\n- **Luxury Boutique Hotels**: 5-star central stays with city views ($220–$380/night)\n- **Comfort Mid-Range**: Modern hotels near transit hubs with breakfast ($90–$160/night)\n- **Budget & Hostels**: Highly-rated clean pod hotels and guest houses ($35–$65/night)`;
      }
      break;

    case "weather":
      const weatherContent = formatSpecialistOutput(currentTripData.weather_results, "");
      if (weatherContent) {
        markdownToRender = `## 🌦️ Climate & Weather Forecast\n\n${weatherContent}`;
      } else {
        markdownToRender = `## 🌦️ Climate & Weather Overview\n\n- **Expected Conditions**: Mild and comfortable sightseeing weather.\n- **Average Temperature**: 18°C – 26°C\n- **Packing Tip**: Bring comfortable walking shoes, versatile light layers, and a compact travel umbrella.`;
      }
      break;

    case "budget":
      const budgetContent = formatSpecialistOutput(currentTripData.budget_results, "");
      markdownToRender = budgetContent ? 
        `## 💰 Financial Assessment & Budget Breakdown\n\n${budgetContent}` : 
        "Budget analysis was not requested for this query.";
      break;

    default:
      markdownToRender = formatSpecialistOutput(currentTripData.answer, "");
  }

  renderMarkdown(resultBox, markdownToRender);
}


// ==========================================
// API Interaction Handlers
// ==========================================
async function sendMessage() {
  if (waitingForApproval) {
    showToast("Please approve or revise the current draft first.", "error");
    return;
  }

  let message = "";
  const input = document.getElementById("userInput");
  
  if (input && input.value.trim()) {
    message = input.value.trim();
  } else {
    syncCustomPrompt();
    message = input ? input.value.trim() : "";
  }

  if (!message) {
    showToast("Please enter your destination or travel requirements above.", "error");
    const destInput = document.getElementById("searchDest");
    if (destInput) destInput.focus();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/api/travel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message,
        thread_id: currentThreadId
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to generate travel plan.");
    }

    currentThreadId = data.thread_id;
    localStorage.setItem("langtrip_thread_id", currentThreadId);

    updateWorkflowUI(data);

    if (data.requires_approval) {
      showResultsHub(data, true);
      showApprovalSection(data);
      showToast("Draft ready! Review and approve below.", "info");
    } else {
      hideApprovalSection();
      showResultsHub(data, false);
      showToast("Travel itinerary generated successfully!", "success");
    }

  } catch (error) {
    showToast(error.message || "An unexpected error occurred.", "error");
  } finally {
    setLoading(false);
  }
}

async function submitApproval(approved) {
  if (!currentThreadId || !waitingForApproval) {
    showToast("No draft is currently waiting for approval.", "error");
    return;
  }

  const feedbackInput = document.getElementById("approvalFeedback");
  const feedback = feedbackInput ? feedbackInput.value.trim() : "";

  if (!approved && !feedback) {
    showToast("Please enter revision feedback before requesting changes.", "error");
    if (feedbackInput) feedbackInput.focus();
    return;
  }

  const approveBtn = document.getElementById("approveBtn");
  const reviseBtn = document.getElementById("reviseBtn");

  // Immediate Click Feedback: Disable & Spin
  if (approveBtn) {
    approveBtn.disabled = true;
    if (approved) {
      approveBtn.innerHTML = `<span class="btn-spinner-ring" style="width:16px;height:16px;border-width:2px;"></span><span>Finalizing Travel Plan...</span>`;
    }
  }
  if (reviseBtn) {
    reviseBtn.disabled = true;
    if (!approved) {
      reviseBtn.innerHTML = `<span class="btn-spinner-ring" style="width:16px;height:16px;border-width:2px;"></span><span>Applying Revisions...</span>`;
    }
  }

  showToast(approved ? "Finalizing your master travel guide..." : "Applying revision notes...", "info");

  try {
    const response = await fetch("/api/travel/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        thread_id: currentThreadId,
        approved: approved,
        feedback: feedback
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to resume travel workflow.");
    }

    updateWorkflowUI(data);
    hideApprovalSection();
    showResultsHub(data, false);
    showToast(approved ? "Itinerary approved! Master travel guide generated." : "Revisions applied to travel plan.", "success");

  } catch (error) {
    showToast(error.message || "Could not resume agent workflow.", "error");
    if (approveBtn) {
      approveBtn.disabled = false;
      approveBtn.innerHTML = `<span>✓</span><span>Approve & Finalize Plan</span>`;
    }
    if (reviseBtn) {
      reviseBtn.disabled = false;
      reviseBtn.innerHTML = `<span>✎</span><span>Apply Revisions</span>`;
    }
  }
}

// ==========================================
// Export Utilities (Clipboard & PDF)
// ==========================================
function copyResult() {
  const resultBox = document.getElementById("resultBox");
  if (!resultBox || !resultBox.innerText.trim()) {
    showToast("No travel plan content to copy.", "error");
    return;
  }

  navigator.clipboard.writeText(resultBox.innerText)
    .then(() => {
      const copyBtnText = document.getElementById("copyBtnText");
      if (copyBtnText) {
        const originalText = copyBtnText.textContent;
        copyBtnText.textContent = "Copied!";
        setTimeout(() => {
          copyBtnText.textContent = originalText;
        }, 1800);
      }
      showToast("Travel plan copied to clipboard!", "success");
    })
    .catch(() => {
      showToast("Could not copy to clipboard.", "error");
    });
}

function downloadPDF() {
  const pdfElement = document.getElementById("pdfContent");
  if (!pdfElement || !currentTripData) {
    showToast("No travel plan available for PDF export.", "error");
    return;
  }

  showToast("Compiling high-resolution travel voucher PDF...", "info");

  const opt = {
    margin: [0.4, 0.4, 0.4, 0.4],
    filename: `LangTrip_Voucher_${currentThreadId ? currentThreadId.slice(0, 8) : "Plan"}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff"
    },
    jsPDF: {
      unit: "in",
      format: "a4",
      orientation: "portrait"
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] }
  };

  html2pdf()
    .set(opt)
    .from(pdfElement)
    .save()
    .then(() => {
      showToast("Travel voucher PDF downloaded!", "success");
    })
    .catch(() => {
      showToast("PDF export error. You can print directly with Ctrl+P.", "error");
    });
}

// ==========================================
// Keyboard Event Listeners
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll(".segment-input");
  inputs.forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  });

  const userInput = document.getElementById("userInput");
  if (userInput) {
    userInput.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
  }
});

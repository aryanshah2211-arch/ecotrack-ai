# 🌱 EcoTrack AI — Carbon Footprint Tracker

> **Ideathon 2026 · Challenge 3: Improve Everyday Life with AI**  
> Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

---

## 🎯 Chosen Vertical

**Challenge 3 — Improve Everyday Life with AI**  
Problem: Help individuals understand, track, and reduce their carbon footprint through simple actions and personalized AI insights.

---

## 💡 What It Does

EcoTrack AI is a **single-file web app** (no install, no backend, no server) that helps any Indian user:

1. **Track** their daily carbon footprint across 4 categories — Transport, Food, Energy, Shopping
2. **Understand** their impact with visual breakdowns and comparison to India's average
3. **Reduce** it through AI-powered personalized tips and a 7-day action plan
4. **Stay motivated** with streaks, badges, and a weekly trend chart

---

## 🏗️ Approach & Logic

### Emission Calculation
Carbon emissions are calculated using **IPCC-aligned emission factors** adapted for India:

| Category     | Factors Used |
|--------------|-------------|
| Transport    | Per-km CO₂ by vehicle type (India grid for EV) |
| Food         | Daily diet type × waste multiplier |
| Energy       | India grid factor: **0.82 kg CO₂/kWh** + cooking fuel |
| Shopping     | Per-order delivery emissions + plastic use |

### AI Layer (Google Gemini API)
- **AI Eco Coach** — Conversational chatbot with India-specific context
- **Instant AI Tip** — After calculating, get 3 specific tips for your exact breakdown
- **7-Day Action Plan** — Personalized plan generated from your history
- All prompts include India-specific context (food, transport, grid factor)

### Data Flow
```
User Input → Emission Calculation → Visual Result
                                         ↓
                               Save to localStorage
                                         ↓
                         History + Streak + Badges + Chart
                                         ↓
                            AI Prompt (with user context)
                                         ↓
                              Gemini API → Personalized Tips
```

---

## ⚙️ How the Solution Works

### Tech Stack
- **Frontend:** Pure HTML + CSS + Vanilla JavaScript (single file)
- **AI:** Google Gemini API (`gemini-2.0-flash`) — free tier
- **Charts:** Chart.js (CDN)
- **Storage:** Browser `localStorage` (no backend needed)

### Key Features
| Feature | Description |
|---------|-------------|
| 📊 Daily Tracker | Input transport, food, energy, shopping data |
| 🌍 CO₂ Score | Compared against India's ~6 kg/day average |
| 📉 Breakdown Bars | Visual split of emissions by category |
| 🤖 AI Coach | Ask anything — India-specific eco advice |
| 💡 Smart Tips | 8 static tips + AI-generated personalized plan |
| 📅 History | Last 14 days of entries |
| 📈 Trend Chart | Weekly line chart of your footprint |
| 🔥 Streaks | Consecutive day tracking counter |
| 🏅 Badges | 8 unlockable achievement badges |

---

## 🚀 How to Run

### Option 1 — Open directly in browser
```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ecotrack-ai.git
cd ecotrack-ai

# Open in browser
open index.html   # macOS
start index.html  # Windows
xdg-open index.html  # Linux
```

### Option 2 — Local server
```bash
cd ecotrack-ai
python -m http.server 8000
# Visit http://localhost:8000
```

### Setup API Key
1. Go to [aistudio.google.com](https://aistudio.google.com) → **Get API Key** (free)
2. Open the app → Paste your key in the **API Key Setup** section
3. Click **Save Key** — stored locally in your browser, never sent anywhere else

---

## 📐 Assumptions Made

1. **India-specific emission factors** — electricity grid factor of 0.82 kg CO₂/kWh (India's current average per CEA 2023)
2. **Daily food emissions** are approximated per diet type (IPCC AR6 + FAO India data)
3. **LPG cooking** = 1.5 kg CO₂ per day (average Indian household usage)
4. **India average daily footprint** = ~6 kg CO₂e per person (World Bank / IPCC estimates)
5. **API key security** — stored in `localStorage` (browser-only); suitable for personal/demo use
6. **Single-user** — no authentication; data stored per browser

---

## 📁 File Structure

```
ecotrack-ai/
├── index.html      # Complete app — HTML + CSS + JS in one file
└── README.md       # This file
```

---

## 🔒 Security Considerations

- API key stored in browser `localStorage` only — never transmitted to any third party
- No user data leaves the browser except to Gemini API (only the prompt text)
- No cookies, no tracking, no external analytics
- Input fields sanitized before use in calculations

---

## ♿ Accessibility

- Semantic HTML elements used throughout
- Color is never the sole indicator (labels always present)
- Mobile-responsive layout (tested on 375px width)
- Keyboard navigation supported (Enter to send chat)
- High contrast color scheme for readability

---

## 🌍 Real-World Usability

- **No install required** — just open `index.html`
- **No login** — works instantly
- **Works offline** for tracking (AI features need internet)
- **India-first** — emission factors, food options, and AI prompts tuned for India
- **Free** — Gemini API free tier is sufficient for personal use

---

## 👤 Author

Built for **Ideathon 2026** · Challenge 3  
Powered by **Google Gemini API** · Carbon data from IPCC, CEA India, FAO

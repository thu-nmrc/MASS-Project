# MASS_System

This is the English README for the MASS project. MASS is a lightweight, locally-run LLM-assisted system that includes a frontend UI (`static/`), a minimal backend HTTP service (`server.py`), and a packaging script to build a Windows executable (`build_exe.py`).

## 🎯 Use Cases
- 📈 Economic simulation: competition, pricing strategies
- 🏛️ Policy analysis: assessing policy impacts
- 🎮 Game AI: strategy testing, balance tuning
- 🔬 Social experiments: group behavior research
- 💼 Business scenarios: negotiation, crisis response
- 🏢 Organizational management: hierarchical decision-making, information flow
- ⚔️ Military simulation: command chains, tactical coordination
- 🛒 Customer journey: touch point analysis, experience optimization (NEW!)
- 📋 Project management: phase progression, milestone tracking (NEW!)

## 💡 Best Practices
1. Background rules: provide environment, constraints, decision/output format (ideally >1000 tokens for caching effectiveness).
2. Agent prompts: describe role, goals, attributes, and current state (200–500 tokens recommended).
3. Random events: trigger at key rounds, quantify impacts, and provide context and guidance.
4. Cost control: start with cheaper models; tune number of agents and rounds; use caching when appropriate.

## Project Layout (short)

- `server.py`: backend HTTP service exposing `/api/*` endpoints (see API section below).
- `static/`: frontend assets (includes `index.html`, `js/app.js`, `js/i18n.js`).
- `examples/`: several example scenario JSON files for quick import or demos.
- `exports/`: output files generated during runs; contains `messages.csv` by default.
- `build_exe.py`: build helper using `pyinstaller`.
- `start.bat` / `start.sh`/`mass.exe`: scripts to start the development server.

## Quick Overview

This repository implements an agent/dialog management system using an OpenAI-compatible API backend. The frontend (`static/js/app.js`) manages agents, events, run control, export and configuration import/export. The backend (`server.py`) forwards requests to an LLM (compatible with OpenAI Chat Completions), implements retry policies, and provides CSV/Excel export features.

## Key Features

- Multi-agent support with per-agent custom API configuration
- Retry mechanism for common codes (429 / 5xx) with configurable retry counts
- Export support: CSV (default) and Excel (optional `openpyxl`)
- Ability to package as a Windows executable via `pyinstaller` and `build_exe.py`

## Environment & Dependencies

- Python 3.7+ (core functionality uses the standard library; Excel export requires `openpyxl`)
- To build a Windows executable, install `pyinstaller`.

Install optional dependencies:

```powershell
pip install -r requirements.txt
```

`requirements.txt` typically contains `openpyxl` and `pyinstaller` (if you need Excel export or packaging).

## Run (development mode)

From project root, on Windows you can run:

```powershell
# Run the backend development server
python server.py
# Or use the provided batch script (you may need to adjust the Python path inside the script)
start.bat
```

The default server port is 8899 (this can be changed by the `MASS_PORT` environment variable; if the start script or `server.py` overrides it, follow the code). The frontend static files live in `static/`; open `static/index.html` to access the UI (when the backend runs locally the frontend will call `/api/*` endpoints via fetch).

## Backend API Summary

The backend provides the following main endpoints (mostly `POST` requests):

- `/api/config`: save/update global configuration (e.g. `baseUrl`, `apiKey`, `modelName`, `multiApi`).
- `/api/test`: test connection / API call to validate `baseUrl` and `apiKey`. Request body contains `{ baseUrl, apiKey, model, messages }`.
- `/api/complete`: core completion endpoint. The backend constructs and forwards `{ model, messages }` to `baseUrl + '/chat/completions'` and returns a response including `status`, `json`, `raw`, `attempts`, etc.
- `/api/save_message`: save a single interaction record to export (CSV).
- `/api/export`: read `exports/messages.csv` and return the generated CSV file.
- `/api/export_excel`: convert exports to Excel format (requires `openpyxl`).

Note: the backend implements a retry policy for request forwarding (common retry codes: 429, 500, 502, 503, 504). The frontend can configure retry counts via `maxRetries`.

## Frontend Overview

- `static/js/app.js`: main frontend logic — manages agent objects, events, run control, export, and config import/export. Agent objects include fields: `id, name, prompt, useCustomApi, customBaseUrl, customApiKey, customModel, subordinates, includeSubSubordinates, returnDefaultEnabled`.
- `static/js/i18n.js`: internationalization strings (supports `zh-CN` and `en`). When modifying UI text, update this file accordingly.

Caching and Multi-API note:

- When `multiApi === false` and `disableCache === false`, the frontend sends the background rules as a cacheable `system` message (with `cache_control`). Enabling multi-API mode automatically disables caching (they are mutually exclusive).

## Examples

The repository contains several example scenarios under `examples/`, for example:

- `scenario_simple_test.json`
- `scenario_with_events.json`

These can be imported via the frontend UI to quickly create test scenarios.

API test example for `/api/test`:

```json
POST /api/test
{
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-4",
  "messages": [{"role":"system","content":"ping"},{"role":"user","content":"ping"}]
}
```

## Exports & CSV format

- The backend writes interaction logs to `exports/messages.csv`. `/api/export` reads that CSV and returns a generated `export_{n}.csv`.
- Excel export requires `openpyxl`; if not installed, Excel functionality is disabled.
- Please do not change the CSV column order arbitrarily — doing so may break the `export_csv` / `export_excel` logic.

## Packaging to a Windows Executable

To package the project into a portable single-file executable, use `pyinstaller`:

```powershell
pip install pyinstaller
python build_exe.py
```

`build_exe.py` will run `pyinstaller` and write build output into `build/` (an example build is already included under `build/MASS/`).

## Maintenance & Extension Guidelines

- Before changing backend endpoints or response formats, locate the corresponding `fetch` usages in `static/js/app.js` and update the frontend accordingly.
- When adding new backend endpoints, add routes in `server.py` (e.g. in `RequestHandler.do_POST`) and update corresponding `fetch` calls and error handling in `static/js/app.js`.
- To expand per-agent API features, follow the `agent.useCustomApi` front-end field and UI flows (`editAgent` / `configAgentApi`).

## Troubleshooting

- If the backend cannot reach the LLM, verify `baseUrl` and `apiKey`, and try `/api/test` to get the error code.
- If Excel export fails, ensure `openpyxl` is installed.
- If packaging fails, confirm `pyinstaller` compatibility and inspect logs under `build/`.

## 📚 Academic Citation (recommended)

If you use this method or software in academic research, please cite:

Hu, Xiaoli; Shen, Yang; You, Keke (2025).
*Multi-Agent Social Simulation: An Experimental Framework for Language-Native Social Experiments.*
Agents4Science 2025 Workshop (Stanford), October 22, 2025.
Available at: https://openreview.net/forum?id=emsnDnmtYP#discussion

**BibTeX**

```bibtex
@inproceedings{HuShenYou2025MASS,
  author    = {Xiaoli Hu and Yang Shen and Keke You},
  title     = {Multi-Agent Social Simulation: An Experimental Framework for Language-Native Social Experiments},
  booktitle = {Agents4Science 2025 Workshop},
  address   = {Stanford},
  year      = {2025},
  month     = {October},
  url       = {https://openreview.net/forum?id=emsnDnmtYP#discussion}
}
```

The repository also contains `CITATION.cff` for automatic academic citation tools.

## 🤝 Contributing
Contributions are welcome — please open a pull request.

## 📄 License
This project is released under the **MIT License**.

Originally authored by **Xiaoli Hu** (MASS project).
See the [LICENSE](./LICENSE) file for details.

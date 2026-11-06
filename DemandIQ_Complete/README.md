# DemandIQ — Complete local project

DemandIQ is a full-stack sales/demand forecasting app. This package combines the responsive React + TypeScript UI, FastAPI backend, CSV upload/inspection, ARIMA and Prophet forecasting, chronological holdout evaluation, model comparison, forecast chart, and CSV export in one project.

## What's included

- `frontend/`: React, TypeScript, Vite, Recharts, Lucide icons, responsive adaptive dark/light UI.
- `backend/`: FastAPI endpoints for health check, CSV upload/inspection, and forecast/evaluation.
- `sample_data/sample_sales.csv`: 120 daily synthetic observations for a safe end-to-end test.
- `setup_windows.bat`: one-time installation of Python and Node dependencies.
- `start_backend.bat` and `start_frontend.bat`: launch the two services.

## Requirements

- Windows 10/11
- Python 3.10+ (Python 3.11 recommended)
- Node.js LTS with npm
- PyCharm (recommended, not required)
- Internet connection for first-time dependency installation

## Easiest Windows setup

1. Extract this whole folder to a normal writable location, for example `C:\Users\anush\Downloads\DemandIQ_Complete`.
2. Open the folder in PyCharm.
3. Double-click `setup_windows.bat` (or run it from a terminal). Wait for it to finish; Prophet may take several minutes.
4. Start `start_backend.bat` and leave that window running.
5. Start `start_frontend.bat` in a second window and leave it running.
6. Open the local URL Vite prints, usually `http://127.0.0.1:5173` (it may choose 5174 if 5173 is busy).
7. Click **Test API**; it should show API connected.
8. Click **Import data** and choose `sample_data/sample_sales.csv` to test the complete flow, or choose your own CSV.
9. Check the date and numeric demand columns, choose `Compare both`, select a horizon, and click **Run real forecast**.

The backend CORS configuration allows Vite ports 5173 and 5174 on localhost.

## Manual PyCharm terminal setup

Backend terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend terminal:

```powershell
cd frontend
npm install
npm run dev
```

API health check: `http://127.0.0.1:8000/api/health`
API docs: `http://127.0.0.1:8000/docs`

## CSV format

Your CSV needs at least two columns: a date/time column and a numeric sales/demand column. Choose those columns in the app after uploading. The initial forecasting version requires at least 20 valid dated observations. Repeated dates are aggregated by summing demand. CSV files up to 15 MB are supported.

## Forecast methodology

- ARIMA baseline: ARIMA(1,1,1).
- Prophet: trend/seasonality model, with weekly seasonality enabled when enough observations exist and yearly seasonality enabled for long daily series.
- Evaluation: last 20% of chronologically sorted observations is held out; the models are fitted on the earlier observations and scored on the holdout.
- Metrics: MAE, RMSE, and MAPE; MAPE excludes zero or near-zero actual values.
- After evaluation, the model is refit to all available observations to produce future estimates.

The best model in the comparison is the model with the lower holdout MAE among successful models. This is an initial baseline implementation, not a guarantee of best possible accuracy. Forecast horizon means future observations/periods; dates are inferred from observed spacing when possible. Review frequency and results before making business decisions. Uploads are processed in memory and not saved to disk by the backend.

## Troubleshooting

- `npm is not recognized`: install Node.js LTS, close/reopen terminals, then run setup again.
- API offline: make sure `start_backend.bat` is running and `http://127.0.0.1:8000/api/health` opens.
- Forecasting fails: use a CSV with a parseable date column, numeric demand column, and at least 20 valid observations; inspect the API message.
- Port 5173 busy: Vite may use 5174; this is already allowed by the backend CORS configuration.

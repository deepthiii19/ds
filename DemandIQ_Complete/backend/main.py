from io import BytesIO
import math
import warnings
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from prophet import Prophet

app = FastAPI(
    title="DemandIQ API",
    description="Backend for the DemandIQ sales and demand forecasting platform",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173", "http://localhost:5173",
        "http://127.0.0.1:5174", "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "DemandIQ API", "stage": "CSV upload enabled"}


@app.post("/api/data/upload")
async def upload_csv(file: UploadFile = File(...)):
    """Read a CSV and return a preview plus basic data-quality metadata."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Please use a CSV smaller than 15 MB for this stage.")

    try:
        # utf-8-sig handles common CSV files exported from Excel.
        df = pd.read_csv(BytesIO(content), encoding="utf-8-sig")
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(BytesIO(content), encoding="latin-1")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not read this CSV: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read this CSV: {exc}") from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="The CSV has headers but no data rows.")
    if len(df.columns) < 2:
        raise HTTPException(status_code=400, detail="The CSV needs at least two columns, usually a date and a sales/demand value.")

    # Return JSON-safe values and a limited preview, not the entire file.
    df = df.where(pd.notna(df), None)
    columns = [str(c) for c in df.columns]
    date_candidates = []
    for col in columns:
        label = col.lower()
        if any(word in label for word in ("date", "time", "day", "month")):
            date_candidates.append(col)
    if not date_candidates:
        for col in columns:
            parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().mean() >= 0.8:
                date_candidates.append(col)
                break

    numeric_columns = [str(c) for c in df.select_dtypes(include="number").columns]
    if not numeric_columns:
        for col in columns:
            converted = pd.to_numeric(df[col], errors="coerce")
            if converted.notna().sum() >= max(2, int(len(df) * 0.5)):
                numeric_columns.append(col)

    preview_df = df.head(100).copy()
    preview_df = preview_df.astype(object).where(pd.notna(preview_df), None)
    preview_rows = preview_df.to_dict(orient="records")
    missing = {str(col): int(df[col].isna().sum()) for col in df.columns}
    numeric_summary = {}
    for col in numeric_columns:
        values = pd.to_numeric(df[col], errors="coerce")
        numeric_summary[col] = {
            "mean": None if pd.isna(values.mean()) else round(float(values.mean()), 3),
            "min": None if pd.isna(values.min()) else round(float(values.min()), 3),
            "max": None if pd.isna(values.max()) else round(float(values.max()), 3),
            "sum": None if pd.isna(values.sum()) else round(float(values.sum()), 3),
        }

    return {
        "filename": file.filename,
        "rows": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns": columns,
        "date_candidates": date_candidates,
        "numeric_columns": numeric_columns,
        "missing_values": missing,
        "duplicate_rows": int(df.duplicated().sum()),
        "preview": preview_rows,
        "numeric_summary": numeric_summary,
        "message": "CSV parsed successfully. Review the columns before forecasting.",
    }



def _read_forecast_series(content: bytes, date_column: str, target_column: str) -> pd.DataFrame:
    """Parse and validate the chosen date/target columns for forecasting."""
    try:
        df = pd.read_csv(BytesIO(content), encoding="utf-8-sig")
    except UnicodeDecodeError:
        df = pd.read_csv(BytesIO(content), encoding="latin-1")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {exc}") from exc

    if date_column not in df.columns or target_column not in df.columns:
        raise HTTPException(status_code=400, detail="Selected date or demand column was not found in the CSV.")
    if date_column == target_column:
        raise HTTPException(status_code=400, detail="Choose different columns for date and demand.")

    series = pd.DataFrame({
        "ds": pd.to_datetime(df[date_column], errors="coerce"),
        "y": pd.to_numeric(df[target_column], errors="coerce"),
    })
    series = series.dropna(subset=["ds", "y"])
    if series.empty:
        raise HTTPException(status_code=400, detail="No valid rows remain after parsing the selected date and demand columns.")
    # If multiple records share a date, aggregate demand for that date.
    series = series.groupby("ds", as_index=False)["y"].sum().sort_values("ds")
    if len(series) < 20:
        raise HTTPException(status_code=400, detail="Please provide at least 20 valid dated observations for a meaningful first forecast.")
    if not np.isfinite(series["y"]).all():
        raise HTTPException(status_code=400, detail="The demand column contains non-finite values.")
    return series.reset_index(drop=True)


def _metrics(actual, predicted):
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    errors = actual - predicted
    nonzero = np.abs(actual) > 1e-9
    mape = float(np.mean(np.abs(errors[nonzero] / actual[nonzero])) * 100) if nonzero.any() else None
    return {
        "mae": round(float(np.mean(np.abs(errors))), 3),
        "rmse": round(float(np.sqrt(np.mean(errors ** 2))), 3),
        "mape": round(mape, 3) if mape is not None and math.isfinite(mape) else None,
    }


def _infer_freq(dates: pd.Series) -> str:
    """Infer a pandas frequency string from the observed dates (shared by all models)."""
    idx = pd.DatetimeIndex(dates)
    if len(idx) >= 3:
        try:
            freq = pd.infer_freq(idx)
        except ValueError:
            freq = None
        if freq:
            return freq
    # infer_freq returns None when there are gaps, so fall back to simple rules.
    if len(idx) < 2:
        return "D"
    if idx.is_month_start.all():
        return "MS"
    if idx.is_month_end.all():
        return "ME"
    diffs = idx.to_series().diff().dropna()
    step_days = max(1, int(round(diffs.median().total_seconds() / 86400)))
    return f"{step_days}D"


def _future_dates(last_date, freq: str, horizon: int) -> pd.DatetimeIndex:
    return pd.date_range(start=last_date, periods=horizon + 1, freq=freq)[1:]


def _regular_series(series: pd.DataFrame, freq: str):
    """Datetime-indexed series on a regular grid, with gaps linearly interpolated.

    ARIMA assumes equally spaced observations, so missing dates must be filled
    rather than silently skipped. Returns (grid_series, number_of_filled_gaps).
    """
    s = series.set_index("ds")["y"]
    grid_index = pd.date_range(s.index.min(), s.index.max(), freq=freq)
    on_grid = s.index.isin(grid_index).mean()
    if on_grid < 0.9:
        raise ValueError(
            f"Dates do not follow a regular '{freq}' spacing, so ARIMA cannot be applied reliably."
        )
    grid = s.reindex(grid_index)
    filled = int(grid.isna().sum())
    return grid.interpolate(limit_direction="both"), filled


def _pick_best_model(results: dict):
    """Pick the model that wins on the most metrics (MAE, RMSE, MAPE); ties go to lower MAE."""
    if len(results) == 1:
        name = next(iter(results))
        return name, "Only one model was run."
    wins = {name: 0 for name in results}
    for metric in ("mae", "rmse", "mape"):
        values = {n: r["metrics"][metric] for n, r in results.items() if r["metrics"][metric] is not None}
        if len(values) == len(results):
            wins[min(values, key=values.get)] += 1
    best = min(results, key=lambda n: (-wins[n], results[n]["metrics"]["mae"]))
    rule = "Model with the most wins across MAE, RMSE and MAPE on the holdout set; ties broken by lower MAE."
    return best, rule


@app.post("/api/forecast")
async def forecast_csv(
    file: UploadFile = File(...),
    date_column: str = Form(...),
    target_column: str = Form(...),
    horizon: int = Form(14),
    model: str = Form("Compare both"),
):
    """Evaluate ARIMA/Prophet on a chronological holdout, then forecast future periods."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")
    if horizon < 1 or horizon > 365:
        raise HTTPException(status_code=400, detail="Forecast horizon must be between 1 and 365 periods.")
    if model not in {"ARIMA", "Prophet", "Compare both"}:
        raise HTTPException(status_code=400, detail="Choose ARIMA, Prophet, or Compare both.")
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Please use a CSV smaller than 15 MB.")
    series = _read_forecast_series(content, date_column, target_column)
    holdout_size = max(3, int(round(len(series) * 0.2)))
    train, test = series.iloc[:-holdout_size].copy(), series.iloc[-holdout_size:].copy()
    if len(train) < 10:
        raise HTTPException(status_code=400, detail="Not enough training observations after creating the test period.")

    # Frequency and future dates are computed once and shared by every model.
    freq = _infer_freq(series["ds"])
    future_dates = _future_dates(series["ds"].max(), freq, horizon)

    results = {}
    errors = {}
    models_to_run = ["ARIMA", "Prophet"] if model == "Compare both" else [model]

    for model_name in models_to_run:
        try:
            extra = {}
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                if model_name == "ARIMA":
                    grid, filled = _regular_series(series, freq)
                    train_end = train["ds"].iloc[-1]
                    train_grid = grid.loc[:train_end]
                    steps = len(grid.loc[train_end:]) - 1
                    fitted = ARIMA(train_grid, order=(1, 1, 1)).fit()
                    pred = fitted.forecast(steps=steps).reindex(test["ds"])
                    if pred.isna().any():
                        raise ValueError("Holdout dates do not line up with the regular date grid.")
                    test_pred = pred.to_numpy(dtype=float)
                    metrics = _metrics(test["y"].to_numpy(), test_pred)
                    full_fit = ARIMA(grid, order=(1, 1, 1)).fit()
                    future_values = np.asarray(full_fit.forecast(steps=horizon), dtype=float)
                    extra["filled_gaps"] = filled
                else:
                    prophet_model = Prophet(
                        daily_seasonality=False,
                        weekly_seasonality=len(train) >= 14,
                        yearly_seasonality=len(train) >= 730,
                    )
                    prophet_model.fit(train[["ds", "y"]])
                    test_pred = prophet_model.predict(pd.DataFrame({"ds": test["ds"].to_list()}))["yhat"].to_numpy(dtype=float)
                    metrics = _metrics(test["y"].to_numpy(), test_pred)
                    full_prophet = Prophet(
                        daily_seasonality=False,
                        weekly_seasonality=len(series) >= 14,
                        yearly_seasonality=len(series) >= 730,
                    )
                    full_prophet.fit(series[["ds", "y"]])
                    future_values = full_prophet.predict(pd.DataFrame({"ds": future_dates}))["yhat"].to_numpy(dtype=float)

            results[model_name] = {
                "metrics": metrics,
                "forecast": [
                    {"date": pd.Timestamp(d).strftime("%Y-%m-%d"), "prediction": round(float(v), 3)}
                    for d, v in zip(future_dates, future_values)
                ],
                "test_predictions": [round(float(v), 3) for v in test_pred],
                **extra,
            }
        except Exception as exc:
            errors[model_name] = str(exc)

    if not results:
        raise HTTPException(status_code=400, detail="Forecasting failed. " + " | ".join(f"{k}: {v}" for k, v in errors.items()))
    best_model, selection_rule = _pick_best_model(results)
    return {
        "filename": file.filename,
        "date_column": date_column,
        "target_column": target_column,
        "observations": int(len(series)),
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "horizon": horizon,
        "frequency": freq,
        "frequency_note": "Forecast dates use inferred date spacing when possible; inspect your data frequency before using results for decisions.",
        "best_model": best_model,
        "selection_rule": selection_rule,
        "models": results,
        "model_errors": errors,
        "historical": [
            {"date": pd.Timestamp(d).strftime("%Y-%m-%d"), "actual": round(float(v), 3)}
            for d, v in zip(series["ds"], series["y"])
        ],
    }
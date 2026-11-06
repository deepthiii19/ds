  import { useMemo, useState } from 'react'
import {
  Activity, ArrowUpRight, Bell, Boxes, ChartNoAxesCombined,
  CheckCircle, ChevronDown, CircleHelp, Database, Download,
  FileChartColumn, Gauge, LayoutDashboard, Menu, Moon,
  MoreHorizontal, Settings2, Sparkles, Sun, UploadCloud, X,
  TrendingUp, TrendingDown, Lightbulb, PackageCheck, CalendarDays,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'

type Page = 'Overview' | 'Data studio' | 'Forecast lab' |
  'Model intelligence' | 'Demand planning' | 'Settings'

type UploadResult = {
  filename: string
  rows: number
  column_count: number
  columns: string[]
  date_candidates: string[]
  numeric_columns: string[]
  missing_values: Record<string, number>
  duplicate_rows: number
  preview: Record<string, unknown>[]
  numeric_summary: Record<string, {
    mean: number | null
    min: number | null
    max: number | null
    sum: number | null
  }>
  message: string
}

type ForecastResult = {
  filename: string
  date_column: string
  target_column: string
  observations: number
  train_rows: number
  test_rows: number
  horizon: number
  best_model: string
  models: Record<string, {
    metrics: { mae: number; rmse: number; mape: number | null }
    forecast: { date: string; prediction: number }[]
    test_predictions: number[]
  }>
  model_errors: Record<string, string>
  historical: { date: string; actual: number }[]
}

const pages: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Data studio', icon: Database },
  { label: 'Forecast lab', icon: ChartNoAxesCombined },
  { label: 'Model intelligence', icon: Gauge },
  { label: 'Demand planning', icon: Boxes },
]

const sample = [
  { date: 'May 01', sales: 96 }, { date: 'May 04', sales: 108 },
  { date: 'May 07', sales: 103 }, { date: 'May 10', sales: 119 },
  { date: 'May 13', sales: 112 }, { date: 'May 16', sales: 128 },
  { date: 'May 19', sales: 122 }, { date: 'May 22', sales: 139 },
  { date: 'May 25', sales: 131 }, { date: 'May 28', sales: 146 },
]

const fmt = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '—' :
    n.toLocaleString(undefined, { maximumFractionDigits: 2 })

function App() {
  const [page, setPage] = useState<Page>('Overview')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [uploadedName, setUploadedName] = useState('')
  const [data, setData] = useState<UploadResult | null>(null)
  const [dateColumn, setDateColumn] = useState('')
  const [targetColumn, setTargetColumn] = useState('')
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [model, setModel] = useState('Compare both')
  const [horizon, setHorizon] = useState('14')
  const [uploading, setUploading] = useState(false)
  const [forecasting, setForecasting] = useState(false)
  const [apiStatus, setApiStatus] = useState('Not checked')
  const [notice, setNotice] = useState('')
  // Inventory-planning inputs; users can adjust these to match their business.
  const [currentStock, setCurrentStock] = useState('40')
  const [incomingStock, setIncomingStock] = useState('10')
  const [safetyStock, setSafetyStock] = useState('0')

  function navigate(next: Page) {
    setPage(next)
    setMobileNav(false)
    setWorkspaceOpen(false)
    setProfileOpen(false)
    setNotice('')
  }

  async function checkApi() {
    setApiStatus('Checking...')
    try {
      const response = await fetch('http://127.0.0.1:8000/api/health')
      if (!response.ok) throw new Error('Health check failed')
      const result = await response.json()
      setApiStatus(`Connected · ${result.status}`)
      setNotice('Backend connection successful.')
    } catch {
      setApiStatus('Offline')
      setNotice('Backend unavailable. Start FastAPI on port 8000.')
    }
  }

  async function uploadCsv(file?: File) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotice('Please select a CSV file.')
      return
    }
    setUploading(true)
    setUploadedName(file.name)
    setSourceFile(file)
    setForecast(null)
    setNotice('Uploading CSV...')
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('http://127.0.0.1:8000/api/data/upload', {
        method: 'POST', body,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Upload failed')
      const parsed = result as UploadResult
      setData(parsed)
      setDateColumn(parsed.date_candidates[0] || '')
      setTargetColumn(parsed.numeric_columns[0] || '')
      setApiStatus('Connected')
      setNotice(`${parsed.message} ${parsed.rows} rows loaded.`)
      navigate('Data studio')
    } catch (error) {
      setNotice(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  async function runForecast() {
    if (!sourceFile || !data) {
      setNotice('Upload a CSV in Data studio first.')
      navigate('Data studio')
      return
    }
    if (!dateColumn || !targetColumn) {
      setNotice('Select your date and numeric sales columns.')
      return
    }
    setForecasting(true)
    setNotice('Running forecast models...')
    try {
      const body = new FormData()
      body.append('file', sourceFile)
      body.append('date_column', dateColumn)
      body.append('target_column', targetColumn)
      body.append('horizon', horizon)
      body.append('model', model)
      const response = await fetch('http://127.0.0.1:8000/api/forecast', {
        method: 'POST', body,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Forecast failed')
      setForecast(result as ForecastResult)
      setApiStatus('Connected')
      setNotice(`Forecast complete. Best model: ${result.best_model}.`)
      navigate('Forecast lab')
    } catch (error) {
      setNotice(`Forecast failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setForecasting(false)
    }
  }

  const chartData = useMemo(() => {
    if (forecast) {
      const chosen = forecast.models[model] ||
        forecast.models[forecast.best_model] ||
        Object.values(forecast.models)[0]
      return [
        ...forecast.historical.map(r => ({
          date: r.date, actual: r.actual, prediction: null as number | null,
        })),
        ...(chosen?.forecast || []).map(r => ({
          date: r.date, actual: null as number | null, prediction: r.prediction,
        })),
      ]
    }
    if (data) return data.preview.map((row, i) => ({
      date: String(row[dateColumn] ?? `Row ${i + 1}`),
      actual: Number(row[targetColumn]),
      prediction: null as number | null,
    })).filter(r => Number.isFinite(r.actual))
    return sample.map(r => ({
      date: r.date, actual: r.sales, prediction: null as number | null,
    }))
  }, [forecast, model, data, dateColumn, targetColumn])

  const missing = data
    ? Object.values(data.missing_values).reduce((sum, n) => sum + n, 0)
    : null

  const chosenModel = forecast
    ? forecast.models[model] || forecast.models[forecast.best_model] ||
      Object.values(forecast.models)[0]
    : undefined

  function exportForecast() {
    if (!forecast) {
      setNotice('Run a forecast first.')
      return
    }
    const csv = [
      'date,predicted_demand',
      ...(chosenModel?.forecast || []).map(r => `${r.date},${r.prediction}`),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'demandiq_forecast.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`app-shell ${theme} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileNav && <button className="mobile-scrim" aria-label="Close menu"
        onClick={() => setMobileNav(false)} />}

      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Activity size={21} /></div>
          <div className="brand-name">demand<span>iq</span>
            <small>DEMAND INTELLIGENCE</small>
          </div>
          <button type="button" className="icon-button sidebar-collapse"
            title="Collapse or expand sidebar" aria-label="Toggle sidebar"
            onClick={() => setSidebarCollapsed(v => !v)}>
            <Menu size={19} />
          </button>
        </div>

        <div className="workspace-menu-wrap">
          <button type="button" className="workspace-switch"
            onClick={() => {
              setWorkspaceOpen(v => !v)
              setProfileOpen(false)
            }} aria-expanded={workspaceOpen}>
            <div className="workspace-avatar">N</div>
            <div className="workspace-copy"><strong>Northstar Retail</strong>
              <span>Workspace · Starter</span></div>
            <ChevronDown size={15} />
          </button>
          {workspaceOpen && <div className="sidebar-popup">
            <strong>Northstar Retail</strong><span>Current workspace</span>
            <button onClick={() => navigate('Overview')}>Workspace overview</button>
            <button onClick={() => navigate('Settings')}>Workspace settings</button>
          </div>}
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          {pages.map(({ label, icon: Icon }) => <button type="button"
            key={label} className={`nav-item ${page === label ? 'active' : ''}`}
            onClick={() => navigate(label)} title={label}
            aria-current={page === label ? 'page' : undefined}>
            <Icon size={18} /><span>{label}</span>
            {label === 'Forecast lab' && <span className="nav-dot" />}
          </button>)}
        </nav>

        <div className="sidebar-bottom">
          <button className="help-card" onClick={() => setHelpOpen(true)}>
            <span className="help-icon"><CircleHelp size={18} /></span>
            <span><strong>Need a hand?</strong><small>Explore the quick guide</small></span>
            <ArrowUpRight size={15} />
          </button>
          <button className={`nav-item ${page === 'Settings' ? 'active' : ''}`}
            onClick={() => navigate('Settings')}>
            <Settings2 size={18} /><span>Settings</span>
          </button>
          <div className="profile-row">
            <div className="profile-avatar">DA</div>
            <div className="profile-copy"><strong>Project workspace</strong>
              <span>Local development</span></div>
            <button className="icon-button" aria-label="Project menu"
              onClick={() => {
                setProfileOpen(v => !v)
                setWorkspaceOpen(false)
              }}><MoreHorizontal size={18} /></button>
          </div>
          {profileOpen && <div className="sidebar-popup profile-popup">
            <strong>Project workspace</strong><span>Local development</span>
            <button onClick={() => navigate('Overview')}>Go to overview</button>
            <button onClick={() => navigate('Settings')}>Open settings</button>
            <button onClick={() => {
              setProfileOpen(false)
              setHelpOpen(true)
            }}>Help and guide</button>
          </div>}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="mobile-menu icon-button" aria-label="Open navigation"
              onClick={() => setMobileNav(true)}><Menu size={20} /></button>
            <span>Workspace</span><span className="crumb-slash">/</span><strong>{page}</strong>
          </div>
          <div className="top-actions">
            <div className="api-pill"><span className="status-dot" />{apiStatus}</div>
            <button className="icon-button" title="Toggle theme"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button" title="Notifications"
              onClick={() => setNotice('You are all caught up.')}><Bell size={18} /></button>
            <button className="top-avatar" onClick={() => navigate('Settings')}>D</button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" />
              SALES &amp; DEMAND ANALYTICS</div>
              <h1>{page === 'Overview' ? 'Dashboard.' : page}</h1>
              <p>{page === 'Overview' ? 'A clearer view of your sales and demand.'
                : `Manage ${page.toLowerCase()} for your workspace.`}</p>
            </div>
            <div className="heading-actions">
              <button className="secondary-button" onClick={checkApi}><Activity size={16} /> Test API</button>
              <button className="primary-button" onClick={() => {
                navigate('Data studio')
                document.getElementById('csv-upload')?.click()
              }}><UploadCloud size={16} /> Import data</button>
            </div>
          </div>

          {notice && <div className="notice" role="status">
            <CheckCircle size={17} /><span>{notice}</span>
            <button aria-label="Dismiss" onClick={() => setNotice('')}><X size={16} /></button>
          </div>}

          {page === 'Overview' && <>
            <section className="welcome-banner">
              <div className="banner-orb orb-one" /><div className="banner-orb orb-two" />
              <div className="banner-copy">
                <div className="banner-tag"><Sparkles size={13} /> YOUR FORECASTING WORKSPACE</div>
                <h2>See the signal.<br /><span>Plan with confidence.</span></h2>
                <p>Explore your sales data, compare forecasting models, and plan ahead.</p>
                <button className="banner-button" onClick={() => navigate('Forecast lab')}>
                  Explore forecast lab <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="banner-visual"><div className="visual-grid" />
                <svg viewBox="0 0 360 190" className="hero-svg">
                  <path d="M5 152 C28 140 35 155 58 124 S88 139 112 100 S146 124 169 81 S207 106 230 64 S260 86 284 48 S321 65 355 19"
                    fill="none" stroke="#81e2cd" strokeWidth="3" />
                </svg>
              </div>
            </section>
            <section className="kpi-grid">
              <Kpi title="Total recorded sales"
                value={fmt(data?.numeric_summary[targetColumn]?.sum ?? 14533)}
                unit={data ? targetColumn : 'sample units'} />
              <Kpi title="Average value"
                value={fmt(data?.numeric_summary[targetColumn]?.mean ?? 121.1)} unit="average" />
              <Kpi title="Missing cells" value={missing === null ? '—' : String(missing)}
                unit={data ? 'in dataset' : 'upload data'} />
              <Kpi title="Forecast status" value={forecast ? 'Complete' : 'Not run'}
                unit={forecast ? forecast.best_model : 'run a forecast'} />
            </section>
            <div className="analysis-grid">
              <ChartPanel chartData={chartData} />
              <ModelPanel data={data} dateColumn={dateColumn} targetColumn={targetColumn}
                setDateColumn={setDateColumn} setTargetColumn={setTargetColumn}
                model={model} setModel={setModel} horizon={horizon} setHorizon={setHorizon}
                runForecast={runForecast} forecasting={forecasting} />
            </div>
          </>}

          {page === 'Data studio' && <>
            <section className="panel upload-panel">
              <div className="upload-top"><div className="upload-icon"><UploadCloud size={20} /></div>
                <span className="file-type">CSV</span></div>
              <h3>Import historical sales</h3>
              <p>Upload a CSV with dates and numeric sales values.</p>
              <label className="drop-zone" htmlFor="csv-upload">
                <input id="csv-upload" type="file" accept=".csv,text/csv"
                  onChange={e => uploadCsv(e.target.files?.[0])} />
                <FileChartColumn size={22} />
                <strong>{uploading ? 'Processing...' : uploadedName || 'Choose a CSV file'}</strong>
                <span>{data ? 'Uploaded and parsed successfully' : 'Select a file from your computer'}</span>
                <small>CSV files · maximum 15 MB</small>
              </label>
            </section>
            {data && <section className="panel data-preview-panel">
              <h3>{data.filename}</h3><p>{data.rows} rows · {data.column_count} columns</p>
              <p>Missing cells: {missing} · Duplicate rows: {data.duplicate_rows}</p>
              <label className="field-label" htmlFor="date-column">Date column</label>
              <select id="date-column" value={dateColumn}
                onChange={e => setDateColumn(e.target.value)}>
                {data.columns.map(col => <option key={col}>{col}</option>)}
              </select>
              <label className="field-label" htmlFor="target-column">Sales / demand column</label>
              <select id="target-column" value={targetColumn}
                onChange={e => setTargetColumn(e.target.value)}>
                {data.numeric_columns.map(col => <option key={col}>{col}</option>)}
              </select>
              <DataTable data={data} />
            </section>}
          </>}

          {page === 'Forecast lab' && <>
            <section className="panel model-panel">
              <h3>Generate a demand forecast</h3>
              <p>Choose the model and forecast horizon.</p>
              {data ? <ModelPanel data={data} dateColumn={dateColumn}
                targetColumn={targetColumn} setDateColumn={setDateColumn}
                setTargetColumn={setTargetColumn} model={model} setModel={setModel}
                horizon={horizon} setHorizon={setHorizon}
                runForecast={runForecast} forecasting={forecasting} />
                : <p>Upload a CSV in Data studio to begin.</p>}
            </section>
            {forecast && <>
              <ChartPanel chartData={chartData} />
              <section className="panel data-preview-panel">
                <h3>Forecast results</h3>
                <p>Best model: <strong>{forecast.best_model}</strong></p>
                <p>Training rows: {forecast.train_rows} · Test rows: {forecast.test_rows}</p>
                <button className="secondary-button" onClick={exportForecast}>
                  <Download size={16} /> Export forecast CSV</button>
                <ForecastTable rows={chosenModel?.forecast || []} />
              </section>
            </>}
          </>}

          {page === 'Model intelligence' && <section className="panel data-preview-panel">
            <h3>Model intelligence</h3>
            {!forecast ? <p>Run a forecast first to see evaluation metrics.</p> : <>
              <p>Best evaluated model: <strong>{forecast.best_model}</strong></p>
              <table className="data-table"><thead><tr>
                <th>Model</th><th>MAE</th><th>RMSE</th><th>MAPE</th>
              </tr></thead><tbody>
                {Object.entries(forecast.models).map(([name, r]) => <tr key={name}>
                  <td>{name}</td><td>{fmt(r.metrics.mae)}</td><td>{fmt(r.metrics.rmse)}</td>
                  <td>{r.metrics.mape == null ? 'N/A' : `${fmt(r.metrics.mape)}%`}</td>
                </tr>)}
              </tbody></table>
              {Object.entries(forecast.model_errors).map(([name, error]) =>
                <p key={name}>{name}: {error}</p>)}
            </>}
            <button className="primary-button" onClick={() => navigate('Forecast lab')}>
              Open Forecast lab <ArrowUpRight size={16} /></button>
          </section>}

          {page === 'Demand planning' && <>
            <section className="panel data-preview-panel">
              <div className="insights-heading">
                <div>
                  <div className="panel-kicker">FROM FORECAST TO ACTION</div>
                  <h3>Demand planning</h3>
                  <p>Understand the forecast, then estimate the extra stock you may need.</p>
                </div>
                {forecast && <span className="insights-badge"><CheckCircle size={13} /> Forecast ready</span>}
              </div>
              {!forecast ? <div className="insight-empty">
                Upload a sales CSV in Data studio, then run a forecast in Forecast lab. Your demand insights and stock recommendation will appear here.
              </div> : <>
                <p>Forecast horizon: {forecast.horizon} periods · Selected model: {forecast.best_model} · Target: {forecast.target_column}</p>
                <ForecastTable rows={chosenModel?.forecast || []} />
                <button className="secondary-button" onClick={exportForecast}>
                  <Download size={16} /> Export demand plan</button>
                <DemandInsights
                  forecast={forecast}
                  selectedModel={chosenModel}
                  targetColumn={targetColumn}
                  currentStock={currentStock}
                  setCurrentStock={setCurrentStock}
                  incomingStock={incomingStock}
                  setIncomingStock={setIncomingStock}
                  safetyStock={safetyStock}
                  setSafetyStock={setSafetyStock}
                />
              </>}
              <p>Predictions are estimates; actual demand may differ. Use the recommendation alongside supplier lead times and business knowledge.</p>
            </section>
          </>}

          {page === 'Settings' && <section className="panel settings-panel">
            <div className="panel-kicker">PREFERENCES</div><h3>Settings</h3>
            <p>Customize your local DemandIQ workspace.</p>
            <div className="setting-row"><div><strong>Appearance</strong>
              <p>Choose the dashboard theme.</p></div>
              <button className="secondary-button" onClick={() =>
                setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                Switch to {theme === 'dark' ? 'light' : 'dark'} mode</button>
            </div>
            <div className="setting-row"><div><strong>Backend connection</strong>
              <p>FastAPI at 127.0.0.1:8000.</p></div>
              <button className="secondary-button" onClick={checkApi}>Test connection</button>
            </div>
            <div className="setting-row"><div><strong>Workspace</strong>
              <p>Northstar Retail · Local development.</p></div><span>Local</span></div>
            <div className="setting-row"><div><strong>Dataset</strong>
              <p>{data ? `${data.filename} · ${data.rows} rows` : 'No dataset uploaded.'}</p></div>
              <button className="secondary-button" onClick={() => navigate('Data studio')}>Manage data</button>
            </div>
            <p>Cloud accounts and multi-user workspace management are not configured.</p>
          </section>}

          <footer className="app-footer">
            <div><Activity size={14} /> DemandIQ · Sales &amp; Demand Intelligence</div>
            <div>Local development · v0.4.0</div>
          </footer>
        </div>
      </main>

      {helpOpen && <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
        <section className="help-modal" role="dialog" aria-modal="true"
          aria-labelledby="guide-title" onClick={e => e.stopPropagation()}>
          <button className="modal-close icon-button" aria-label="Close guide"
            onClick={() => setHelpOpen(false)}><X size={18} /></button>
          <div className="panel-kicker">QUICK START GUIDE</div>
          <h2 id="guide-title">Welcome to DemandIQ</h2>
          <ol>
            <li><strong>Import data:</strong> upload a CSV with dates and sales values.</li>
            <li><strong>Inspect data:</strong> check columns and missing values.</li>
            <li><strong>Run a forecast:</strong> choose ARIMA, Prophet, or compare both.</li>
            <li><strong>Review results:</strong> compare MAE, RMSE and MAPE and export predictions.</li>
          </ol>
          <button className="primary-button" onClick={() => {
            setHelpOpen(false)
            navigate('Data studio')
          }}>Start with your data <ArrowUpRight size={16} /></button>
        </section>
      </div>}
    </div>
  )
}

function Kpi({ title, value, unit }: { title: string; value: string; unit: string }) {
  return <div className="panel kpi-card">
    <div className="kpi-top"><span>{title}</span><Activity size={17} /></div>
    <div className="kpi-value">{value}<small>{unit}</small></div>
  </div>
}

function ChartPanel({ chartData }: {
  chartData: { date: string; actual: number | null; prediction: number | null }[]
}) {
  return <section className="panel trend-panel">
    <div className="panel-kicker">SALES PERFORMANCE</div><h3>Demand over time</h3>
    <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#63cdb5" stopOpacity={0.22} />
        <stop offset="100%" stopColor="#63cdb5" stopOpacity={0.01} />
      </linearGradient></defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip />
        <Area dataKey="actual" name="Actual sales" stroke="#62cbb2"
          fill="url(#salesFill)" connectNulls={false} />
        <Line dataKey="prediction" name="Forecast" stroke="#a1a9ff"
          strokeDasharray="5 5" dot={false} connectNulls={false} />
      </AreaChart>
    </ResponsiveContainer></div>
  </section>
}

function ModelPanel({
  data, dateColumn, targetColumn, setDateColumn, setTargetColumn,
  model, setModel, horizon, setHorizon, runForecast, forecasting,
}: {
  data: UploadResult | null
  dateColumn: string
  targetColumn: string
  setDateColumn: (v: string) => void
  setTargetColumn: (v: string) => void
  model: string
  setModel: (v: string) => void
  horizon: string
  setHorizon: (v: string) => void
  runForecast: () => void
  forecasting: boolean
}) {
  return <section className="panel model-panel">
    <div className="panel-kicker">FORECASTING ENGINE</div><h3>Model workspace</h3>
    {data && <>
      <label className="field-label" htmlFor="model-date">Date column</label>
      <select id="model-date" value={dateColumn} onChange={e => setDateColumn(e.target.value)}>
        {data.columns.map(col => <option key={col}>{col}</option>)}
      </select>
      <label className="field-label" htmlFor="model-target">Sales / demand column</label>
      <select id="model-target" value={targetColumn} onChange={e => setTargetColumn(e.target.value)}>
        {data.numeric_columns.map(col => <option key={col}>{col}</option>)}
      </select>
    </>}
    <label className="field-label" htmlFor="model-select">Forecasting approach</label>
    <select id="model-select" value={model} onChange={e => setModel(e.target.value)}>
      <option>Compare both</option><option>ARIMA</option><option>Prophet</option>
    </select>
    <label className="field-label" htmlFor="model-horizon">Forecast horizon</label>
    <select id="model-horizon" value={horizon} onChange={e => setHorizon(e.target.value)}>
      <option value="7">7 days</option><option value="14">14 days</option>
      <option value="30">30 days</option><option value="60">60 days</option>
      <option value="90">90 days</option>
    </select>
    <button className="run-button" disabled={forecasting} onClick={runForecast}>
      <Sparkles size={16} /> {forecasting ? 'Training models...' : 'Run real forecast'}
    </button>
  </section>
}

function DataTable({ data }: { data: UploadResult }) {
  return <div className="table-scroll"><table className="data-table">
    <thead><tr>{data.columns.map(col => <th key={col}>{col}
      <small>{data.missing_values[col] || 0} missing</small></th>)}</tr></thead>
    <tbody>{data.preview.slice(0, 10).map((row, i) => <tr key={i}>
      {data.columns.map(col => <td key={col}>{String(row[col] ?? '—')}</td>)}
    </tr>)}</tbody>
  </table></div>
}

function ForecastTable({ rows }: { rows: { date: string; prediction: number }[] }) {
  return <div className="table-scroll"><table className="data-table">
    <thead><tr><th>Date</th><th>Predicted demand</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.date}>
      <td>{row.date}</td><td>{fmt(row.prediction)}</td>
    </tr>)}</tbody>
  </table></div>
}


function DemandInsights({
  forecast, selectedModel, targetColumn,
  currentStock, setCurrentStock, incomingStock, setIncomingStock,
  safetyStock, setSafetyStock,
}: {
  forecast: ForecastResult
  selectedModel: ForecastResult['models'][string] | undefined
  targetColumn: string
  currentStock: string
  setCurrentStock: (value: string) => void
  incomingStock: string
  setIncomingStock: (value: string) => void
  safetyStock: string
  setSafetyStock: (value: string) => void
}) {
  const predictions = (selectedModel?.forecast || [])
    .map(item => ({ ...item, prediction: Number(item.prediction) }))
    .filter(item => Number.isFinite(item.prediction))
  const historical = forecast.historical
    .map(item => ({ ...item, actual: Number(item.actual) }))
    .filter(item => Number.isFinite(item.actual))

  const forecastTotal = predictions.reduce((sum, item) => sum + Math.max(0, item.prediction), 0)
  const forecastAverage = predictions.length ? forecastTotal / predictions.length : 0
  const firstForecast = predictions[0]
  const lastForecast = predictions[predictions.length - 1]
  const peakForecast = predictions.length
    ? predictions.reduce((max, item) => item.prediction > max.prediction ? item : max, predictions[0])
    : undefined
  const forecastChange = firstForecast && lastForecast
    ? lastForecast.prediction - firstForecast.prediction
    : 0
  const forecastChangePct = firstForecast && Math.abs(firstForecast.prediction) > 0.000001
    ? (forecastChange / Math.abs(firstForecast.prediction)) * 100
    : null

  const firstHistorical = historical[0]
  const lastHistorical = historical[historical.length - 1]
  const peakHistorical = historical.length
    ? historical.reduce((max, item) => item.actual > max.actual ? item : max, historical[0])
    : undefined
  const historicalChangePct = firstHistorical && lastHistorical && Math.abs(firstHistorical.actual) > 0.000001
    ? ((lastHistorical.actual - firstHistorical.actual) / Math.abs(firstHistorical.actual)) * 100
    : null

  const stock = Math.max(0, Number(currentStock) || 0)
  const incoming = Math.max(0, Number(incomingStock) || 0)
  const buffer = Math.max(0, Number(safetyStock) || 0)
  const suggestedOrder = Math.max(0, Math.ceil(forecastTotal + buffer - stock - incoming))
  const fmtPct = (value: number | null) =>
    value == null || !Number.isFinite(value)
      ? 'not available'
      : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  const direction = forecastChange > 0.000001 ? 'rising'
    : forecastChange < -0.000001 ? 'falling' : 'roughly stable'
  const DirectionIcon = forecastChange > 0.000001 ? TrendingUp
    : forecastChange < -0.000001 ? TrendingDown : Activity
  const fmtTarget = (value: number) => fmt(value)

  if (!predictions.length) {
    return <div className="insight-empty">No forecast values are available for the selected model. Run the forecast again or select a model with valid results.</div>
  }

  return <div className="insights-layout">
    <section className="panel insights-panel">
      <div className="insights-heading">
        <div>
          <div className="panel-kicker">AUTOMATICALLY GENERATED FROM YOUR RESULTS</div>
          <h3>What the numbers are telling you</h3>
          <p>These explanations use your uploaded history and selected model's forecast.</p>
        </div>
        <span className="insights-badge"><Lightbulb size={13} /> Insights</span>
      </div>

      <div className="insight-metrics">
        <div className="insight-metric">
          <span>Total predicted value across {predictions.length} periods</span>
          <strong>{fmtTarget(forecastTotal)}</strong>
          <small>{targetColumn}</small>
        </div>
        <div className="insight-metric">
          <span>Average predicted value per period</span>
          <strong>{fmtTarget(forecastAverage)}</strong>
          <small>{targetColumn}</small>
        </div>
        <div className="insight-metric">
          <span>Model MAE on test data</span>
          <strong>{fmt(selectedModel?.metrics.mae)}</strong>
          <small>Lower is generally better</small>
        </div>
      </div>

      <div className="insight-list">
        <div className="insight-item">
          <DirectionIcon size={18} />
          <div>
            <strong>Is predicted demand increasing or decreasing?</strong>
            <p>
              Across the forecast, the values are {direction}.
              {firstForecast && lastForecast
                ? ` They move from ${fmt(firstForecast.prediction)} on ${firstForecast.date} to ${fmt(lastForecast.prediction)} on ${lastForecast.date} (${fmtPct(forecastChangePct)}).`
                : ''}
              {' '}This describes the model's forecast, not a guarantee of what customers will buy.
            </p>
          </div>
        </div>

        <div className="insight-item">
          <CalendarDays size={18} />
          <div>
            <strong>When is the forecasted peak?</strong>
            <p>{peakForecast
              ? `The highest predicted value in this forecast is ${fmt(peakForecast.prediction)} on ${peakForecast.date}. Consider checking stock availability for this period.`
              : 'A peak date cannot be identified from the available forecast.'}</p>
          </div>
        </div>

        <div className="insight-item">
          <Activity size={18} />
          <div>
            <strong>What happened in historical sales?</strong>
            <p>{firstHistorical && lastHistorical
              ? `In the historical series, the value moved from ${fmt(firstHistorical.actual)} on ${firstHistorical.date} to ${fmt(lastHistorical.actual)} on ${lastHistorical.date} (${fmtPct(historicalChangePct)} from first to last observation).`
              : 'Historical observations are not available to compare.'}
              {peakHistorical ? ` The highest historical value in the supplied series was ${fmt(peakHistorical.actual)} on ${peakHistorical.date}.` : ''}
              {' '}This is a numerical comparison; it cannot explain the cause of a change without additional information such as promotions, holidays, or prices.</p>
          </div>
        </div>

        <div className="insight-item">
          <Gauge size={18} />
          <div>
            <strong>How should I interpret model error?</strong>
            <p>
              MAE is {fmt(selectedModel?.metrics.mae)} in the same units as the selected target column.
              {selectedModel?.metrics.mape == null
                ? ' MAPE is unavailable for this model or dataset.'
                : ` MAPE is ${fmt(selectedModel.metrics.mape)}%; interpret it cautiously if actual values can be zero or close to zero.`}
              {' '}These metrics summarize performance on held-out historical test observations; they are not a probability that the next prediction is correct.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section className="panel inventory-panel">
      <div className="panel-kicker">INVENTORY DECISION SUPPORT</div>
      <h3>How much stock might I need?</h3>
      <p>Enter the stock position for the same product and planning period covered by the forecast.</p>

      <div className="inventory-fields">
        <div className="inventory-field">
          <label htmlFor="current-stock">Current usable stock</label>
          <input id="current-stock" type="number" min="0" step="any"
            value={currentStock} onChange={e => setCurrentStock(e.target.value)} />
        </div>
        <div className="inventory-field">
          <label htmlFor="incoming-stock">Incoming stock</label>
          <input id="incoming-stock" type="number" min="0" step="any"
            value={incomingStock} onChange={e => setIncomingStock(e.target.value)} />
        </div>
        <div className="inventory-field">
          <label htmlFor="safety-stock">Safety-stock buffer</label>
          <input id="safety-stock" type="number" min="0" step="any"
            value={safetyStock} onChange={e => setSafetyStock(e.target.value)} />
        </div>
      </div>

      <div className="inventory-result">
        <span>Suggested additional order for this forecast horizon</span>
        <strong>{fmt(suggestedOrder)} {targetColumn === 'Units_Sold' ? 'units' : 'target units'}</strong>
        <p>
          Forecast total {fmt(forecastTotal)} + safety buffer {fmt(buffer)} − current stock {fmt(stock)} − incoming stock {fmt(incoming)}.
          The result is rounded up and cannot be below zero.
        </p>
      </div>

      <div className="insight-disclaimer">
        This is a simplified planning estimate, not an automatic purchase order. Make sure the forecast target represents units (not revenue), and consider supplier lead time, delivery dates, minimum order quantities, and stock reserved for other needs. If your target column is revenue, do not use this order quantity as a number of physical items.
      </div>
    </section>
  </div>
}

export default App
import { useState, useRef, useCallback } from 'react'
import Groq from 'groq-sdk'
import './App.css'

const SYSTEM_PROMPT = `You are a food waste analysis AI for Winnow, a food waste management company.
Analyze the provided image of food waste and return a JSON response with this exact structure:
{
  "items": [
    { "name": "Food Item Name", "weight": 0.00, "cost": 0.00 }
  ],
  "insights": [
    "Insight sentence 1.",
    "Insight sentence 2.",
    "Insight sentence 3."
  ]
}
- weight is in pounds (lb), a realistic estimate for the food waste shown
- cost is in USD, estimated value of the wasted food
- identify 2-5 distinct food items visible as waste
- provide 3 actionable insights for reducing this specific waste
Return ONLY valid JSON, no markdown, no extra text.`

export default function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GROQ_API_KEY || '')
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageMime, setImageMime] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const loadFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setImage(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
      setImageMime(file.type)
      setReport(null)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleImageUpload = (e) => loadFile(e.target.files[0])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    loadFile(e.dataTransfer.files[0])
  }, [])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const handleScan = async () => {
    if (!imageBase64) { fileInputRef.current.click(); return }
    if (!apiKey.trim()) { setError('Please enter your Groq API key.'); return }
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const client = new Groq({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true })
      const response = await client.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
              { type: 'text', text: 'Analyze this food waste image and return the JSON report.' },
            ],
          },
        ],
      })
      const data = JSON.parse(response.choices[0].message.content)
      setReport(data)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to analyze image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalWeight = report ? report.items.reduce((s, i) => s + i.weight, 0).toFixed(2) : null
  const totalCost = report ? report.items.reduce((s, i) => s + i.cost, 0).toFixed(2) : null
  const maxWeight = report ? Math.max(...report.items.map(i => i.weight)) : 1

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
              <path d="M8 12h8M12 8v8"/>
            </svg>
          </div>
          <span className="logo-text">Winnow</span>
        </div>
        <div className="badge">AI-Powered</div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-tag">Food Waste Intelligence</div>
        <h1 className="hero-title">
          Scan. Analyze.<br />
          <span className="gradient-text">Reduce Waste.</span>
        </h1>
        <p className="hero-sub">
          Upload a photo of food waste and get instant AI-powered insights on cost, weight, and reduction strategies.
        </p>
      </section>

      {/* API Key */}
      {!import.meta.env.VITE_GROQ_API_KEY && (
        <div className="api-key-section">
          <label htmlFor="apikey" className="api-key-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Groq API Key
            <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="api-key-link">Get free key</a>
          </label>
          <input
            id="apikey"
            type="password"
            className="api-key-input"
            placeholder="gsk_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      )}

      {/* Upload */}
      <div
        className={`upload-area ${dragging ? 'dragging' : ''} ${image ? 'has-image' : ''}`}
        onClick={() => !image && fileInputRef.current.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {image ? (
          <div className="image-preview-wrap">
            <img src={image} alt="Food waste preview" className="preview-image" />
            <button className="change-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click() }}>
              Change photo
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon-wrap">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="upload-title">Drop your image here</p>
            <p className="upload-sub">or click to browse — JPG, PNG, WEBP</p>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

      {/* Scan Button */}
      <button className={`scan-btn ${loading ? 'loading' : ''}`} onClick={handleScan} disabled={loading}>
        {loading ? (
          <span className="btn-inner">
            <span className="spinner" />
            Analyzing waste...
          </span>
        ) : (
          <span className="btn-inner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {imageBase64 ? 'Analyze Food Waste' : 'Upload & Analyze'}
          </span>
        )}
      </button>

      {error && (
        <div className="error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="report">
          {/* Stat Cards */}
          <div className="stat-cards">
            <div className="stat-card stat-weight">
              <div className="stat-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v1H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4V5a3 3 0 0 0-3-3z"/>
                </svg>
              </div>
              <div className="stat-value">{totalWeight}<span className="stat-unit">lb</span></div>
              <div className="stat-label">Total Weight</div>
            </div>
            <div className="stat-card stat-cost">
              <div className="stat-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="stat-value"><span className="stat-unit-pre">$</span>{totalCost}</div>
              <div className="stat-label">Total Cost</div>
            </div>
            <div className="stat-card stat-items">
              <div className="stat-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>
              <div className="stat-value">{report.items.length}</div>
              <div className="stat-label">Items Detected</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="section-card">
            <h3 className="section-title">
              <span className="section-dot dot-orange" />
              Waste Breakdown
            </h3>
            <div className="breakdown-list">
              {report.items.map((item, idx) => (
                <div key={idx} className="breakdown-item">
                  <div className="breakdown-header">
                    <span className="breakdown-name">{item.name}</span>
                    <div className="breakdown-meta">
                      <span className="breakdown-weight">{item.weight.toFixed(2)} lb</span>
                      <span className="breakdown-cost">${item.cost.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(item.weight / maxWeight) * 100}%`, animationDelay: `${idx * 0.1}s` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="section-card">
            <h3 className="section-title">
              <span className="section-dot dot-purple" />
              AI Insights
            </h3>
            <div className="insights-list">
              {report.insights.map((insight, idx) => (
                <div key={idx} className="insight-item">
                  <div className="insight-num">{idx + 1}</div>
                  <p className="insight-text">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        Powered by Groq AI &amp; Llama 4 &mdash; Built for Winnow
      </footer>
    </div>
  )
}

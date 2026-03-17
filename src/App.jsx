import { useState, useRef } from 'react'
import Anthropic from '@anthropic-ai/sdk'
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
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_ANTHROPIC_API_KEY || '')
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageMime, setImageMime] = useState(null)
  const [status, setStatus] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setImage(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
      setImageMime(file.type)
      setReport(null)
      setStatus('')
    }
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!imageBase64) {
      fileInputRef.current.click()
      return
    }
    if (!apiKey.trim()) {
      setStatus('Please enter your Anthropic API key above.')
      return
    }
    setLoading(true)
    setStatus('Analyzing food waste...')
    setReport(null)
    try {
      const client = new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true })
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: imageMime, data: imageBase64 },
              },
              { type: 'text', text: 'Analyze this food waste image and return the JSON report.' },
            ],
          },
        ],
      })
      const data = JSON.parse(response.content[0].text)
      setReport(data)
      setStatus('Analysis complete.')
    } catch (err) {
      console.error(err)
      setStatus('Error: ' + (err.message || 'Failed to analyze image. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const totalWeight = report
    ? report.items.reduce((sum, i) => sum + i.weight, 0).toFixed(2)
    : null
  const totalCost = report
    ? report.items.reduce((sum, i) => sum + i.cost, 0).toFixed(2)
    : null

  return (
    <div className="app">
      <h1 className="title">Winnow AI Food Waste Scanner</h1>

      {!import.meta.env.VITE_ANTHROPIC_API_KEY && (
        <div className="api-key-section">
          <label htmlFor="apikey" className="api-key-label">Anthropic API Key</label>
          <input
            id="apikey"
            type="password"
            className="api-key-input"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      )}

      <div className="upload-area" onClick={() => fileInputRef.current.click()}>
        {image ? (
          <img src={image} alt="Food waste preview" className="preview-image" />
        ) : (
          <div className="upload-placeholder">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#b47ee5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <p>Click to upload a food waste image</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      <button className="scan-btn" onClick={handleScan} disabled={loading}>
        {loading ? 'Scanning...' : 'Scan Food Waste'}
      </button>

      {status && <p className="status">{status}</p>}

      {report && (
        <div className="report-card">
          <h2 className="report-title">Food Waste Analysis Report</h2>

          <table className="report-table">
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Weight</th>
                <th>Estimated Cost</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.weight.toFixed(2)} lb</td>
                  <td>${item.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <h3>Total Waste</h3>
            <p><strong>Total Weight:</strong> {totalWeight} lb</p>
            <p><strong>Total Cost:</strong> ${totalCost}</p>
          </div>

          <div className="insights">
            <h3>Insights</h3>
            {report.insights.map((insight, idx) => (
              <p key={idx}>• {insight}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

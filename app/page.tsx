'use client'

import { useState, useEffect } from 'react'

const LOCATIONS = [
  { name: 'Rockaway', lat: 40.9012, lon: -74.5143 },
  { name: 'Morris Plains', lat: 40.8282, lon: -74.4804 },
  { name: 'Parsippany', lat: 40.8579, lon: -74.4260 },
  { name: 'Nutley', lat: 40.8194, lon: -74.1593 },
  { name: 'Secaucus', lat: 40.7896, lon: -74.0565 },
  { name: 'Wallington', lat: 40.8532, lon: -74.1138 },
  { name: 'Dover', lat: 40.8837, lon: -74.5621 },
  { name: 'Denville', lat: 40.8918, lon: -74.4774 },
]

interface WeatherData {
  temperature: number
  windSpeed: number
  precipitation: number
  humidity: number
  condition: string
  uvIndex: number
}

interface HourlyForecast {
  time: string
  temperature: number
  windSpeed: number
  precipitation: number
  uvIndex: number
  score: number
}

function getPickleballRating(weather: WeatherData): { score: number; label: string; color: string } {
  let score = 100
  
  if (weather.windSpeed > 20) score -= 40
  else if (weather.windSpeed > 15) score -= 25
  else if (weather.windSpeed > 10) score -= 10
  
  if (weather.precipitation > 0.2) score -= 50
  else if (weather.precipitation > 0) score -= 20
  
  if (weather.temperature < 40 || weather.temperature > 95) score -= 30
  else if (weather.temperature < 50 || weather.temperature > 85) score -= 15
  
  if (weather.humidity > 80) score -= 10
  if (weather.uvIndex > 8) score -= 5
  
  const normalizedScore = Math.max(0, score)
  
  if (normalizedScore >= 80) return { score: normalizedScore, label: 'Perfect Dinking!', color: '#22c55e' }
  if (normalizedScore >= 60) return { score: normalizedScore, label: 'Good Conditions', color: '#84cc16' }
  if (normalizedScore >= 40) return { score: normalizedScore, label: 'Playable', color: '#eab308' }
  return { score: normalizedScore, label: 'Stay Home', color: '#ef4444' }
}

function calculateHourlyScore(temp: number, wind: number, precip: number, uv: number): number {
  let score = 100
  if (wind > 20) score -= 40
  else if (wind > 15) score -= 25
  else if (wind > 10) score -= 10
  if (precip > 0.2) score -= 50
  else if (precip > 0) score -= 20
  if (temp < 40 || temp > 95) score -= 30
  else if (temp < 50 || temp > 85) score -= 15
  if (uv > 8) score -= 5
  return Math.max(0, score)
}

async function fetchWeather(lat: number, lon: number): Promise<{ current: WeatherData; hourly: HourlyForecast[] }> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index&hourly=temperature_2m,wind_speed_10m,precipitation_probability,uv_index&timezone=auto&forecast_days=2`
  )
  const data = await res.json()
  
  const current: WeatherData = {
    temperature: data.current.temperature_2m,
    windSpeed: data.current.wind_speed_10m,
    precipitation: data.current.precipitation,
    humidity: data.current.relative_humidity_2m,
    condition: getWeatherCondition(data.current.weather_code),
    uvIndex: data.current.uv_index,
  }
  
  const hourly: HourlyForecast[] = data.hourly.time.slice(0, 24).map((time: string, i: number) => ({
    time: new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
    temperature: data.hourly.temperature_2m[i],
    windSpeed: data.hourly.wind_speed_10m[i],
    precipitation: data.hourly.precipitation_probability[i] / 100,
    uvIndex: data.hourly.uv_index[i],
    score: calculateHourlyScore(
      data.hourly.temperature_2m[i],
      data.hourly.wind_speed_10m[i],
      data.hourly.precipitation_probability[i] / 100,
      data.hourly.uv_index[i]
    ),
  }))
  
  return { current, hourly }
}

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail',
  }
  return conditions[code] || 'Unknown'
}

function findBestWindow(hourly: HourlyForecast[]): { start: string; end: string; avgScore: number } | null {
  let bestWindow = null
  let bestScore = 0
  
  for (let i = 0; i <= hourly.length - 3; i++) {
    const window = hourly.slice(i, i + 3)
    const avgScore = window.reduce((sum, h) => sum + h.score, 0) / 3
    if (avgScore > bestScore) {
      bestScore = avgScore
      bestWindow = {
        start: window[0].time,
        end: window[2].time,
        avgScore: Math.round(avgScore),
      }
    }
  }
  return bestWindow
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [hourly, setHourly] = useState<HourlyForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [showHourly, setShowHourly] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dink-favorites')
    if (saved) setFavorites(JSON.parse(saved))
  }, [])

  const toggleFavorite = (locName: string) => {
    const newFavorites = favorites.includes(locName)
      ? favorites.filter(f => f !== locName)
      : [...favorites, locName]
    setFavorites(newFavorites)
    localStorage.setItem('dink-favorites', JSON.stringify(newFavorites))
  }

  const shareConditions = () => {
    if (!weather || !selectedLocation) return
    const rating = getPickleballRating(weather)
    const text = `🎯 Let's Dink at ${selectedLocation.name}!\n${rating.label} (${rating.score}%)\n${Math.round(weather.temperature)}°F, ${Math.round(weather.windSpeed)}mph wind`
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const fetchForLocation = async (location: typeof LOCATIONS[0]) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchWeather(location.lat, location.lon)
      setWeather(data.current)
      setHourly(data.hourly)
    } catch (err) {
      setError('Failed to fetch weather')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForLocation(selectedLocation)
  }, [selectedLocation])

  const rating = weather ? getPickleballRating(weather) : null
  const bestWindow = hourly.length > 0 ? findBestWindow(hourly) : null

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <h1 style={{
        fontSize: '3rem',
        color: 'white',
        marginBottom: '0.5rem',
        textAlign: 'center',
      }}>
        🎯 Let's Dink
      </h1>
      <p style={{
        color: 'rgba(255,255,255,0.8)',
        marginBottom: '2rem',
        fontSize: '1.2rem',
      }}>
        Pickleball Weather Conditions
      </p>

      {/* Location Selector */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        justifyContent: 'center',
        marginBottom: '1rem',
        maxWidth: '600px',
      }}>
        {LOCATIONS.map((loc) => (
          <button
            key={loc.name}
            onClick={() => setSelectedLocation(loc)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '9999px',
              border: 'none',
              background: selectedLocation.name === loc.name ? '#fbbf24' : 'rgba(255,255,255,0.2)',
              color: selectedLocation.name === loc.name ? '#000' : '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: selectedLocation.name === loc.name ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >
            {loc.name}
            {favorites.includes(loc.name) && ' ⭐'}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <button
          onClick={() => toggleFavorite(selectedLocation.name)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {favorites.includes(selectedLocation.name) ? '★ Unfavorite' : '☆ Favorite'}
        </button>
        <button
          onClick={shareConditions}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          📋 Share
        </button>
      </div>

      {/* Weather Card */}
      {loading && (
        <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
      )}

      {error && (
        <div style={{ color: '#fca5a5', fontSize: '1.1rem' }}>{error}</div>
      )}

      {weather && rating && !loading && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            {/* Rating Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: rating.color + '20',
              borderRadius: '0.75rem',
            }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: rating.color,
              }}>
                {rating.score}%
              </div>
              <div style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                color: rating.color,
              }}>
                {rating.label}
              </div>
            </div>

            {/* Best Window */}
            {bestWindow && (
              <div style={{
                textAlign: 'center',
                marginBottom: '1.5rem',
                padding: '0.75rem',
                background: '#dbeafe',
                borderRadius: '0.5rem',
              }}>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Best Window</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e40af' }}>
                  {bestWindow.start} - {bestWindow.end}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#22c55e' }}>
                  {bestWindow.avgScore}% conditions
                </div>
              </div>
            )}

            {/* Weather Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.75rem',
            }}>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.round(weather.temperature)}°</div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Temp</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.round(weather.windSpeed)}</div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Wind mph</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{weather.uvIndex}</div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>UV</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{weather.humidity}%</div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Humidity</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{weather.precipitation > 0 ? 'Yes' : 'No'}</div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Rain</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{weather.condition}</div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Condition</div>
              </div>
            </div>
          </div>

          {/* Hourly Toggle */}
          <button
            onClick={() => setShowHourly(!showHourly)}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {showHourly ? 'Hide' : 'Show'} Hourly Forecast
          </button>

          {/* Hourly Forecast */}
          {showHourly && (
            <div style={{
              marginTop: '1rem',
              background: 'white',
              borderRadius: '1rem',
              padding: '1rem',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '300px',
              overflow: 'auto',
            }}>
              {hourly.slice(0, 12).map((h, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem',
                  borderBottom: i < 11 ? '1px solid #e5e7eb' : 'none',
                }}>
                  <span style={{ fontWeight: 'bold', minWidth: '60px' }}>{h.time}</span>
                  <span>{Math.round(h.temperature)}°F</span>
                  <span>{Math.round(h.windSpeed)}mph</span>
                  <span style={{
                    color: h.score >= 80 ? '#22c55e' : h.score >= 60 ? '#84cc16' : h.score >= 40 ? '#eab308' : '#ef4444',
                    fontWeight: 'bold',
                  }}>
                    {h.score}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <p style={{
        marginTop: '2rem',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem',
      }}>
        Data from Open-Meteo • Built for pickleball players
      </p>
    </main>
  )
}
